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
  ArrowLeft, Plus, Minus, Search, History, Loader2, 
  Users, AlertCircle, Clock, Printer, Edit, Trash2, UserPlus
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const REASON_OPTIONS = [
  "ไม่สวมหมวกนิรภัย",
  "ไม่มีใบขับขี่",
  "ท่อไอเสียเสียงดังเกินกำหนด",
  "ขับรถย้อนศร / ผิดกฎจราจร",
  "ดัดแปลงสภาพรถ",
  "จอดรถในที่ห้ามจอด",
  "ทำความดี / ช่วยเหลืองานโรงเรียน",
  "อื่นๆ (ระบุเอง)"
];

interface Student {
  id?: string;
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
  const [dialogOpen, setDialogOpen] = useState(false);

  // State สำหรับจัดการข้อมูล Student (CRUD)
  const [crudDialogOpen, setCrudDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [studentForm, setStudentForm] = useState<Student>({
    name: '', class: '', brand: '', model: '', color: '', licensePlate: ''
  });

  const isSuperAdmin = hasRole('super_admin') || user?.email === 'winawathns11@gmail.com';
  const isAdmin = hasRole('admin') || isSuperAdmin;

  const fetchData = async () => {
    setLoading(true);
    try {
      // ดึงข้อมูลจากตาราง motorcycles ใน Supabase โดยตรง (แทน Google Sheets เพื่อให้ CRUD ทำงานได้)
      const { data: motoData, error: motoError } = await supabase.from('motorcycles').select('*');
      const { data: recData, error: recError } = await supabase.from('score_records').select('*').order('created_at', { ascending: false });

      if (motoData) {
        const formatted = motoData.map(m => ({
          id: m.id,
          name: m.owner_name,
          class: m.classroom,
          brand: m.brand,
          model: m.model,
          color: m.color,
          licensePlate: m.license_plate
        }));
        setStudents(formatted);
      }
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

  // --- ระบบจัดการคะแนน ---
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
      setDialogOpen(false);
      fetchData();
    }
  };

  // --- ระบบ CRUD (เพิ่ม/แก้ไข/ลบ) ---
  const handleOpenAdd = () => {
    setIsEditing(false);
    setStudentForm({ name: '', class: '', brand: '', model: '', color: '', licensePlate: '' });
    setCrudDialogOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setIsEditing(true);
    setStudentForm(s);
    setCrudDialogOpen(true);
  };

  const handleSaveStudent = async () => {
    const payload = {
      owner_name: studentForm.name,
      classroom: studentForm.class,
      brand: studentForm.brand,
      model: studentForm.model,
      color: studentForm.color,
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

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("คุณมั่นใจหรือไม่ที่จะลบข้อมูลนี้? ข้อมูลคะแนนที่เกี่ยวข้องจะไม่ถูกลบแต่จะไม่แสดงผลเชื่อมโยง")) return;
    const { error } = await supabase.from('motorcycles').delete().eq('id', id);
    if (error) toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    else {
      toast({ title: "ลบข้อมูลเรียบร้อยแล้ว" });
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
      <style>{`@media print {.no-print { display: none !important; } #printable-report { display: block !important; }}`}</style>

      <nav className="bg-white border-b sticky top-0 z-50 px-6 h-16 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')}><ArrowLeft className="h-4 w-4 mr-2" /> หน้าแรก</Button>
          <h1 className="font-bold text-slate-800">ระบบจัดการคะแนน</h1>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleOpenAdd}>
              <UserPlus className="h-4 w-4 mr-2" /> เพิ่มข้อมูลรถใหม่
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> พิมพ์รายงาน A4</Button>
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
          {/* ตารางจัดการข้อมูล */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg flex items-center text-slate-700"><Search className="h-5 w-5 mr-2 text-blue-500" /> รายชื่อและคะแนน</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="ค้นหาชื่อ หรือทะเบียน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-4" />
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>ชื่อ-สกุล</TableHead>
                        <TableHead>ทะเบียน</TableHead>
                        <TableHead className="text-center">คะแนน</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student, idx) => (
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
                            <Dialog open={dialogOpen && selectedStudent?.licensePlate === student.licensePlate} onOpenChange={setDialogOpen}>
                              <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => setSelectedStudent(student)}><Plus className="h-4 w-4"/></Button></DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>บันทึกคะแนน: {student.name}</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                  <Input type="number" placeholder="แต้ม +/-" value={scoreChange} onChange={e => setScoreChange(Number(e.target.value))} />
                                  <select className="w-full h-10 px-3 rounded-md border" value={selectedReason} onChange={e => setSelectedReason(e.target.value)}>
                                    {REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                  {selectedReason === "อื่นๆ (ระบุเอง)" && <Textarea value={otherReason} onChange={e => setOtherReason(e.target.value)} placeholder="ระบุเหตุผล..." />}
                                  <Button className="w-full bg-blue-600" onClick={handleSaveScore}>ยืนยันบันทึก</Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* ปุ่ม CRUD เฉพาะ Super Admin */}
                            {isSuperAdmin && (
                              <>
                                <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => handleOpenEdit(student)}><Edit className="h-4 w-4"/></Button>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => student.id && handleDeleteStudent(student.id)}><Trash2 className="h-4 w-4"/></Button>
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

          {/* ประวัติล่าสุด */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b"><CardTitle className="text-md flex items-center"><History className="h-4 w-4 mr-2" /> 10 รายการล่าสุด</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {scoreRecords.slice(0, 10).map((record) => (
                  <div key={record.id} className="p-4 border-b last:border-0">
                    <div className="flex justify-between font-bold text-sm"><span>{record.student_name}</span><span className={record.score_change < 0 ? 'text-red-500' : 'text-green-500'}>{record.score_change > 0 ? '+' : ''}{record.score_change}</span></div>
                    <p className="text-xs text-slate-500 mt-1">{record.reason}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{new Date(record.created_at).toLocaleString('th-TH')}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal สำหรับ CRUD Student */}
      <Dialog open={crudDialogOpen} onOpenChange={setCrudDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มข้อมูลรถจักรยานยนต์ใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">ชื่อ-นามสกุล</label>
              <Input value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">ชั้นเรียน (เช่น ม.1/1)</label>
                <Input value={studentForm.class} onChange={e => setStudentForm({...studentForm, class: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">ทะเบียนรถ</label>
                <Input value={studentForm.licensePlate} onChange={e => setStudentForm({...studentForm, licensePlate: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2 col-span-1">
                <label className="text-sm font-medium">ยี่ห้อ</label>
                <Input value={studentForm.brand} onChange={e => setStudentForm({...studentForm, brand: e.target.value})} />
              </div>
              <div className="grid gap-2 col-span-1">
                <label className="text-sm font-medium">รุ่น</label>
                <Input value={studentForm.model} onChange={e => setStudentForm({...studentForm, model: e.target.value})} />
              </div>
              <div className="grid gap-2 col-span-1">
                <label className="text-sm font-medium">สี</label>
                <Input value={studentForm.color} onChange={e => setStudentForm({...studentForm, color: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCrudDialogOpen(false)}>ยกเลิก</Button>
            <Button className="bg-blue-600" onClick={handleSaveStudent}>บันทึกข้อมูล</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Area */}
      <div id="printable-report" className="hidden p-8 bg-white text-black">
        <h1 className="text-2xl font-bold text-center mb-4">รายงานสรุปคะแนนความประพฤติ</h1>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr>
              <th className="border border-black p-2">วันที่</th>
              <th className="border border-black p-2">ชื่อนักเรียน</th>
              <th className="border border-black p-2">ชั้น</th>
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