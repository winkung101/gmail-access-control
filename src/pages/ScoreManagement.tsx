import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, Plus, Search, History, Loader2, 
  Users, AlertCircle, Clock, Printer, Edit, Trash2, RefreshCw
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
const SHEET_NAME = 'DATA';

const REASON_OPTIONS = [
  "ไม่สวมหมวกนิรภัย", "ไม่มีใบขับขี่", "ท่อไอเสียเสียงดังเกินกำหนด",
  "ขับรถย้อนศร / ผิดกฎจราจร", "ดัดแปลงสภาพรถ", "จอดรถในที่ห้ามจอด",
  "ทำความดี / ช่วยเหลืองานโรงเรียน", "อื่นๆ (ระบุเอง)"
];

interface Student {
  id?: string; // ID จาก Supabase
  name: string;
  class: string;
  brand: string;
  model: string;
  color: string;
  licensePlate: string;
}

const ScoreManagement = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [scoreRecords, setScoreRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scoreChange, setScoreChange] = useState<number>(0);
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [otherReason, setOtherReason] = useState('');
  
  // Dialog States
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Student>({ name: '', class: '', brand: '', model: '', color: '', licensePlate: '' });

  const isSuperAdmin = hasRole('super_admin') || user?.email === 'winawathns11@gmail.com';
  const isAdmin = hasRole('admin') || isSuperAdmin;

  const fixClassroom = (val: string) => {
    if (!val) return '-';
    const thaiMonths: { [key: string]: number } = {
      'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
      'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12
    };
    const parts = val.split('-');
    if (parts.length === 2 && thaiMonths[parts[1]]) return `ม.${thaiMonths[parts[1]]}/${parts[0]}`;
    return val;
  };

  const syncGoogleSheet = async () => {
    try {
      toast({ title: "กำลังซิงค์ข้อมูล...", description: "ดึงข้อมูลจาก Google Sheets และ Supabase" });
      
      // 1. ดึงข้อมูลจาก Google Sheet
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      const response = await fetch(url);
      const text = await response.text();
      const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
      
      let sheetData: any[] = [];
      if (jsonString && jsonString[1]) {
        const json = JSON.parse(jsonString[1]);
        sheetData = json.table.rows.slice(1).map((row: any) => ({
          owner_name: row.c[1]?.v || '',
          classroom: fixClassroom(row.c[2]?.v || ''),
          brand_model: `${row.c[3]?.v || ''} ${row.c[4]?.v || ''}`.trim(),
          vehicle_color: row.c[5]?.v || '',
          license_plate: row.c[6]?.v || '',
        })).filter((s: any) => s.owner_name && s.license_plate);
      }

      // 2. Upsert ลง Supabase (เฉพาะ Super Admin ถึงจะ Sync ได้เพื่อประหยัด Resource)
      if (sheetData.length > 0 && isSuperAdmin) {
        const { error } = await supabase.from('motorcycles').upsert(
          sheetData.map(s => ({ ...s, points: 100 })), 
          { onConflict: 'license_plate', ignoreDuplicates: true } // ถ้าทะเบียนซ้ำจะไม่ทับของเดิม (เผื่อแก้ไปแล้ว)
        );
        if (error) console.error("Sync Error:", error);
      }

      // 3. ดึงข้อมูลล่าสุดจาก Supabase มาแสดง (เพื่อให้ได้ ID สำหรับแก้ไข/ลบ)
      await fetchFromSupabase();

    } catch (error) { 
      console.error('Error:', error);
      toast({ title: "ซิงค์ไม่สำเร็จ", variant: "destructive" });
    }
  };

  const fetchFromSupabase = async () => {
    setLoading(true);
    const { data: motoData } = await supabase.from('motorcycles').select('*');
    const { data: recData } = await supabase.from('score_records').select('*').order('created_at', { ascending: false });

    if (motoData) {
      setStudents(motoData.map(m => ({
        id: m.id,
        name: m.owner_name,
        class: m.classroom,
        brand: m.brand_model?.split(' ')[0] || '',
        model: m.brand_model?.split(' ').slice(1).join(' ') || '',
        color: m.vehicle_color,
        licensePlate: m.license_plate
      })));
    }
    if (recData) setScoreRecords(recData);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/home');
    if (!authLoading && isAdmin) fetchFromSupabase();
  }, [authLoading, user, isAdmin]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCases = scoreRecords.filter(r => r.created_at.startsWith(today)).length;
    const totalDeducted = scoreRecords.filter(r => r.score_change < 0).reduce((sum, r) => sum + Math.abs(r.score_change), 0);
    return { todayCases, totalDeducted };
  }, [scoreRecords]);

  const calculateTotalScore = (licensePlate: string) => {
    const studentRecords = scoreRecords.filter(r => r.license_plate === licensePlate);
    return 100 + studentRecords.reduce((sum, r) => sum + r.score_change, 0);
  };

  const handleSaveScore = async () => {
    const finalReason = selectedReason === "อื่นๆ (ระบุเอง)" ? otherReason : selectedReason;
    if (!selectedStudent || scoreChange === 0 || !finalReason.trim()) return;

    const { error } = await supabase.from('score_records').insert({
      student_name: selectedStudent.name,
      student_class: selectedStudent.class,
      license_plate: selectedStudent.licensePlate,
      score_change: scoreChange,
      reason: finalReason.trim(),
      recorded_by: user?.id
    });

    if (error) toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    else {
      toast({ title: "บันทึกคะแนนสำเร็จ" });
      setScoreDialogOpen(false);
      setScoreChange(0);
      setOtherReason('');
      fetchFromSupabase();
    }
  };

  // --- CRUD Functions (Super Admin Only) ---
  const handleEditClick = (student: Student) => {
    setEditForm(student);
    setEditDialogOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!editForm.id) return;
    const { error } = await supabase.from('motorcycles').update({
      owner_name: editForm.name,
      classroom: editForm.class,
      license_plate: editForm.licensePlate,
      brand_model: `${editForm.brand} ${editForm.model}`,
      vehicle_color: editForm.color
    }).eq('id', editForm.id);

    if (error) toast({ title: "แก้ไขไม่สำเร็จ", description: error.message, variant: "destructive" });
    else {
      toast({ title: "แก้ไขข้อมูลเรียบร้อย" });
      setEditDialogOpen(false);
      fetchFromSupabase();
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("ยืนยันการลบข้อมูลนี้ออกจากระบบ?")) return;
    const { error } = await supabase.from('motorcycles').delete().eq('id', id);
    if (error) toast({ title: "ลบไม่สำเร็จ", variant: "destructive" });
    else {
      toast({ title: "ลบข้อมูลเรียบร้อย" });
      fetchFromSupabase();
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <style>{`@media print {.no-print { display: none !important; } #printable-report { display: block !important; width: 100%; background: white; } body { background: white; }}`}</style>

      <nav className="bg-white border-b sticky top-0 z-50 px-6 h-16 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')}><ArrowLeft className="h-4 w-4 mr-2" /> หน้าแรก</Button>
          <h1 className="font-bold text-slate-800">ระบบจัดการคะแนน</h1>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={syncGoogleSheet}>
              <RefreshCw className="h-4 w-4 mr-2" /> ซิงค์ข้อมูลจาก Sheet
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> พิมพ์รายงาน A4
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-8 space-y-8 no-print">
        {/* Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-blue-600 text-white">
            <CardContent className="pt-6 flex items-center justify-between">
              <div><p className="text-blue-100 text-sm">นักเรียนในระบบ</p><h3 className="text-3xl font-bold">{students.length}</h3></div>
              <Users className="h-10 w-10 opacity-20" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6 flex items-center justify-between">
              <div><p className="text-slate-400 text-sm">เคสวันนี้</p><h3 className="text-3xl font-bold text-slate-800">{stats.todayCases}</h3></div>
              <Clock className="h-10 w-10 text-orange-500 opacity-20" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6 flex items-center justify-between">
              <div><p className="text-slate-400 text-sm">หักรวม</p><h3 className="text-3xl font-bold text-red-600">-{stats.totalDeducted}</h3></div>
              <AlertCircle className="h-10 w-10 text-red-500 opacity-20" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg flex items-center text-slate-700"><Search className="h-5 w-5 mr-2 text-blue-500" /> ค้นหาเพื่อจัดการคะแนน</CardTitle></CardHeader>
              <CardContent>
                <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="ค้นหาชื่อ หรือทะเบียน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-12" /></div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50"><TableRow><TableHead>ชื่อ-สกุล</TableHead><TableHead>ทะเบียน</TableHead><TableHead className="text-center">คะแนน</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredStudents.slice(0, 8).map((student, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{student.name} ({student.class})</TableCell>
                          <TableCell>{student.licensePlate}</TableCell>
                          <TableCell className="text-center font-bold">
                            <span className={calculateTotalScore(student.licensePlate) < 100 ? 'text-red-500' : 'text-green-600'}>
                              {calculateTotalScore(student.licensePlate)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            {/* ปุ่มจัดการคะแนน */}
                            <Button size="sm" variant="outline" onClick={() => { setSelectedStudent(student); setScoreDialogOpen(true); }}>
                              <Plus className="h-4 w-4"/>
                            </Button>
                            
                            {/* ปุ่มแก้ไข/ลบ (เฉพาะ Super Admin) */}
                            {isSuperAdmin && (
                              <>
                                <Button size="sm" variant="ghost" className="text-orange-500 hover:bg-orange-50" onClick={() => handleEditClick(student)}>
                                  <Edit className="h-4 w-4"/>
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => student.id && handleDeleteStudent(student.id)}>
                                  <Trash2 className="h-4 w-4"/>
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b"><CardTitle className="text-md flex items-center text-slate-700"><History className="h-4 w-4 mr-2 text-indigo-500" /> 10 รายการล่าสุด</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                <div className="divide-y">
                  {scoreRecords.slice(0, 10).map((record) => (
                    <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-1"><span className="font-bold text-sm">{record.student_name}</span><span className={record.score_change < 0 ? 'text-red-500' : 'text-green-500'}>{record.score_change > 0 ? '+' : ''}{record.score_change}</span></div>
                      <p className="text-xs text-slate-500 mt-1">{record.reason}</p>
                      <p className="text-[10px] text-slate-300 mt-1">{new Date(record.created_at).toLocaleString('th-TH')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* --- Modal จัดการคะแนน --- */}
      <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>บันทึกคะแนน: {selectedStudent?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="number" placeholder="แต้ม +/-" value={scoreChange} onChange={e => setScoreChange(Number(e.target.value))} />
            <select className="w-full h-10 px-3 rounded-md border" value={selectedReason} onChange={e => setSelectedReason(e.target.value)}>
              {REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {selectedReason === "อื่นๆ (ระบุเอง)" && <Textarea value={otherReason} onChange={e => setOtherReason(e.target.value)} placeholder="ระบุเหตุผล..." />}
            <Button className="w-full bg-blue-600" onClick={handleSaveScore}>ยืนยัน</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Modal แก้ไขข้อมูล (Super Admin Only) --- */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>แก้ไขข้อมูลนักเรียน</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="ชื่อ-สกุล" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="ชั้นเรียน" value={editForm.class} onChange={e => setEditForm({...editForm, class: e.target.value})} />
              <Input placeholder="ทะเบียน" value={editForm.licensePlate} onChange={e => setEditForm({...editForm, licensePlate: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="ยี่ห้อ" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} />
              <Input placeholder="รุ่น" value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>ยกเลิก</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleUpdateStudent}>บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Area */}
      <div id="printable-report" className="hidden p-8 bg-white text-black">
        <h1 className="text-2xl font-bold text-center mb-4">รายงานสรุปคะแนนความประพฤติ</h1>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2">วันที่</th>
              <th className="border border-black p-2">ชื่อนักเรียน</th>
              <th className="border border-black p-2">ชั้น</th>
              <th className="border border-black p-2">ทะเบียน</th>
              <th className="border border-black p-2">คะแนน</th>
              <th className="border border-black p-2">เหตุผล</th>
            </tr>
          </thead>
          <tbody>
            {scoreRecords.map((r, i) => (
              <tr key={i}>
                <td className="border border-black p-2">{new Date(r.created_at).toLocaleDateString('th-TH')}</td>
                <td className="border border-black p-2">{r.student_name}</td>
                <td className="border border-black p-2 text-center">{r.student_class}</td>
                <td className="border border-black p-2 text-center">{r.license_plate}</td>
                <td className="border border-black p-2 text-center">{r.score_change}</td>
                <td className="border border-black p-2">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScoreManagement;