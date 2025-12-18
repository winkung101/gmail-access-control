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
  Users, AlertCircle, Clock, Printer, Edit, Trash2, UserPlus, RefreshCw
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
  id?: string;
  name: string;
  class: string;
  brand: string;
  model: string;
  color: string;
  licensePlate: string;
  source: 'google' | 'supabase'; // ระบุที่มาของข้อมูล
}

interface ScoreRecord {
  id: string;
  student_name: string;
  student_class: string;
  license_plate: string;
  score_change: number;
  reason: string;
  recorded_by: string;
  created_at: string;
}

const ScoreManagement = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Action States
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scoreChange, setScoreChange] = useState<number>(0);
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [otherReason, setOtherReason] = useState('');
  
  // Dialog States
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  
  // CRUD Student States
  const [crudDialogOpen, setCrudDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [studentForm, setStudentForm] = useState<Student>({ 
    name: '', class: '', brand: '', model: '', color: '', licensePlate: '', source: 'supabase' 
  });

  // CRUD Score Record States (แก้ไขประวัติ)
  const [editScoreDialogOpen, setEditScoreDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ScoreRecord | null>(null);

  // Permission Check
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. ดึง Google Sheets
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      const response = await fetch(sheetUrl);
      const text = await response.text();
      const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
      
      let googleData: Student[] = [];
      if (jsonString && jsonString[1]) {
        const json = JSON.parse(jsonString[1]);
        googleData = json.table.rows.slice(1).map((row: any) => ({
          name: row.c[1]?.v || '',
          class: fixClassroom(row.c[2]?.v || ''),
          brand: row.c[3]?.v || '',
          model: row.c[4]?.v || '',
          color: row.c[5]?.v || '',
          licensePlate: row.c[6]?.v || '',
          source: 'google' as const
        })).filter((s: any) => s.name);
      }

      // 2. ดึง Supabase Motorcycles
      const { data: motoData } = await supabase.from('motorcycles').select('*');
      const supabaseStudents: Student[] = motoData ? motoData.map(m => ({
        id: m.id,
        name: m.owner_name,
        class: m.classroom,
        brand: m.brand_model?.split(' ')[0] || '',
        model: m.brand_model?.split(' ').slice(1).join(' ') || '',
        color: m.vehicle_color,
        licensePlate: m.license_plate,
        source: 'supabase' as const
      })) : [];

      // 3. รวมข้อมูล (Supabase ทับ Google ถ้าทะเบียนตรงกัน)
      const mergedStudents = [...googleData];
      supabaseStudents.forEach(supStu => {
        const index = mergedStudents.findIndex(g => g.licensePlate === supStu.licensePlate);
        if (index !== -1) {
          mergedStudents[index] = supStu; // ใช้ข้อมูลจาก Supabase แทน
        } else {
          mergedStudents.push(supStu); // เพิ่มข้อมูลใหม่จาก Supabase
        }
      });

      setStudents(mergedStudents);

      // 4. ดึงประวัติคะแนน
      const { data: recData } = await supabase.from('score_records').select('*').order('created_at', { ascending: false });
      if (recData) setScoreRecords(recData);

    } catch (error) { console.error(error); }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/home');
    if (!authLoading && isAdmin) fetchData();
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

  // --- จัดการคะแนน (เพิ่ม) ---
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
      fetchData(); // รีโหลดเพื่ออัปเดตตารางประวัติ
    }
  };

  // --- จัดการประวัติคะแนน (แก้ไข/ลบ) ---
  const handleUpdateRecord = async () => {
    if (!editingRecord) return;
    const { error } = await supabase.from('score_records').update({
      score_change: editingRecord.score_change,
      reason: editingRecord.reason
    }).eq('id', editingRecord.id);

    if (error) toast({ title: "แก้ไขผิดพลาด", variant: "destructive" });
    else {
      toast({ title: "แก้ไขประวัติสำเร็จ" });
      setEditScoreDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("ยืนยันการลบประวัติรายการนี้? คะแนนจะถูกคำนวณใหม่")) return;
    const { error } = await supabase.from('score_records').delete().eq('id', id);
    if (error) toast({ title: "ลบผิดพลาด", variant: "destructive" });
    else {
      toast({ title: "ลบประวัติเรียบร้อย" });
      fetchData();
    }
  };

  // --- จัดการข้อมูลนักเรียน (CRUD) ---
  const handleSaveStudent = async () => {
    const payload = {
      owner_name: studentForm.name,
      classroom: studentForm.class,
      brand_model: `${studentForm.brand} ${studentForm.model}`,
      vehicle_color: studentForm.color,
      license_plate: studentForm.licensePlate
    };

    let error;
    if (isEditing && studentForm.id) {
      const { error: err } = await supabase.from('motorcycles').update(payload).eq('id', studentForm.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('motorcycles').insert([payload]);
      error = err;
    }

    if (error) toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    else {
      toast({ title: isEditing ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ" });
      setCrudDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (student.source === 'google') {
      toast({ title: "ไม่สามารถลบข้อมูลจาก Google Sheet", description: "กรุณาลบที่ต้นทาง Google Sheets", variant: "destructive" });
      return;
    }
    if (!confirm("ยืนยันการลบข้อมูลนี้?")) return;
    const { error } = await supabase.from('motorcycles').delete().eq('id', student.id);
    if (error) toast({ title: "ลบไม่สำเร็จ", variant: "destructive" });
    else {
      toast({ title: "ลบข้อมูลเรียบร้อย" });
      fetchData();
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
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setIsEditing(false); setStudentForm({ name: '', class: '', brand: '', model: '', color: '', licensePlate: '', source: 'supabase' }); setCrudDialogOpen(true); }}>
              <UserPlus className="h-4 w-4 mr-2" /> เพิ่มรถใหม่
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={fetchData} title="รีโหลด"><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> รายงาน A4</Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-8 space-y-8 no-print">
        {/* Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-blue-600 text-white">
            <CardContent className="pt-6 flex items-center justify-between">
              <div><p className="text-blue-100 text-sm">นักเรียนทั้งหมด</p><h3 className="text-3xl font-bold">{students.length}</h3></div>
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
          {/* Main Table: Student List */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg flex items-center text-slate-700"><Search className="h-5 w-5 mr-2 text-blue-500" /> ค้นหาเพื่อจัดการคะแนน</CardTitle></CardHeader>
              <CardContent>
                <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="ค้นหาชื่อ, ห้อง หรือทะเบียน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-12" /></div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50"><TableRow><TableHead>ชื่อ-สกุล</TableHead><TableHead>ทะเบียน</TableHead><TableHead className="text-center">คะแนน</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredStudents.slice(0, 10).map((student, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {student.name} <span className="text-xs text-slate-400">({student.source === 'google' ? 'Google' : 'DB'})</span>
                          </TableCell>
                          <TableCell>{student.licensePlate}</TableCell>
                          <TableCell className="text-center font-bold">
                            <span className={calculateTotalScore(student.licensePlate) < 100 ? 'text-red-500' : 'text-green-600'}>{calculateTotalScore(student.licensePlate)}</span>
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedStudent(student); setScoreDialogOpen(true); }}><Plus className="h-4 w-4"/></Button>
                            {isSuperAdmin && student.source === 'supabase' && (
                              <>
                                <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => { setStudentForm(student); setIsEditing(true); setCrudDialogOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteStudent(student)}><Trash2 className="h-4 w-4"/></Button>
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

          {/* History Panel */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b"><CardTitle className="text-md flex items-center text-slate-700"><History className="h-4 w-4 mr-2 text-indigo-500" /> ประวัติ 10 รายการล่าสุด</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                <div className="divide-y">
                  {scoreRecords.slice(0, 10).map((record) => (
                    <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors group relative">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-slate-800">{record.student_name}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${record.score_change < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{record.score_change > 0 ? '+' : ''}{record.score_change}</span>
                      </div>
                      <p className="text-xs text-slate-500">{record.reason}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] text-slate-300">{new Date(record.created_at).toLocaleString('th-TH')}</p>
                        {/* ปุ่มลบ/แก้ไข ประวัติ (เฉพาะ Super Admin) */}
                        {isSuperAdmin && (
                          <div className="hidden group-hover:flex gap-2">
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-500" onClick={() => { setEditingRecord(record); setEditScoreDialogOpen(true); }}><Edit className="h-3 w-3"/></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleDeleteRecord(record.id)}><Trash2 className="h-3 w-3"/></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* --- Modal จัดการคะแนน (เพิ่ม) --- */}
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

      {/* --- Modal แก้ไขประวัติคะแนน (History CRUD) --- */}
      <Dialog open={editScoreDialogOpen} onOpenChange={setEditScoreDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขประวัติคะแนน</DialogTitle></DialogHeader>
          {editingRecord && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-500">นักเรียน: {editingRecord.student_name}</p>
              <Input type="number" value={editingRecord.score_change} onChange={e => setEditingRecord({...editingRecord, score_change: Number(e.target.value)})} />
              <Textarea value={editingRecord.reason} onChange={e => setEditingRecord({...editingRecord, reason: e.target.value})} />
              <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleUpdateRecord}>บันทึกการแก้ไข</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- Modal เพิ่ม/แก้ไข ข้อมูลนักเรียน --- */}
      <Dialog open={crudDialogOpen} onOpenChange={setCrudDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{isEditing ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มข้อมูลรถใหม่'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="ชื่อ-สกุล" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="ชั้นเรียน" value={studentForm.class} onChange={e => setStudentForm({...studentForm, class: e.target.value})} />
              <Input placeholder="ทะเบียน" value={studentForm.licensePlate} onChange={e => setStudentForm({...studentForm, licensePlate: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="ยี่ห้อ" value={studentForm.brand} onChange={e => setStudentForm({...studentForm, brand: e.target.value})} />
              <Input placeholder="สี" value={studentForm.color} onChange={e => setStudentForm({...studentForm, color: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCrudDialogOpen(false)}>ยกเลิก</Button>
            <Button className="bg-blue-600" onClick={handleSaveStudent}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Report */}
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
        <div className="mt-20 flex justify-between px-10"><div className="text-center"><p className="mb-16">ลงชื่อ......................</p><p>ผู้รายงาน</p></div><div className="text-center"><p className="mb-16">ลงชื่อ......................</p><p>หัวหน้าฝ่าย</p></div></div>
      </div>
    </div>
  );
};

export default ScoreManagement;