import { useState, useEffect, useMemo } from 'react';
import aswLogo from '@/assets/asw-logo.png';
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
  Users, AlertCircle, Clock, Printer, Edit, Trash2, UserPlus, RefreshCw, XCircle
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
  source: 'google' | 'supabase';
}

const ScoreManagement = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [scoreRecords, setScoreRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States สำหรับ Dialog
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scoreChange, setScoreChange] = useState<number>(0);
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [otherReason, setOtherReason] = useState('');
  
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [crudDialogOpen, setCrudDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [studentForm, setStudentForm] = useState<Student>({ 
    name: '', class: '', brand: '', model: '', color: '', licensePlate: '', source: 'supabase' 
  });

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

      // 2. ดึง Supabase
      const { data: motoData } = await (supabase as any).from('motorcycles').select('*');
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

      // รวมข้อมูล (Supabase อยู่บน Google อยู่ล่าง หรือผสานกัน)
      // การแสดงผล: เอาข้อมูล Supabase ไว้ก่อนเพื่อให้เห็นอันที่แก้ไขได้ง่ายๆ
      setStudents([...supabaseStudents, ...googleData]);

      // 3. ดึงประวัติคะแนน
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
      // รีโหลดเฉพาะประวัติ
      const { data } = await supabase.from('score_records').select('*').order('created_at', { ascending: false });
      if (data) setScoreRecords(data);
    }
  };

  // --- ฟังก์ชันลบข้อมูล (Handle Delete) ---
  const handleDeleteStudent = async (student: Student) => {
    // กรณีที่ 1: ข้อมูลมาจาก Google Sheet
    if (student.source === 'google') {
      toast({ 
        title: "ลบไม่ได้", 
        description: "ข้อมูลนี้ดึงมาจาก Google Sheets กรุณาไปลบที่ไฟล์ต้นฉบับ", 
        variant: "destructive" 
      });
      return;
    }

    // กรณีที่ 2: ข้อมูลมาจาก Supabase (ลบได้)
    if (!confirm(`ยืนยันการลบข้อมูลของ ${student.name}?`)) return;
    
    const { error } = await (supabase as any).from('motorcycles').delete().eq('id', student.id);
    if (error) {
      toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ลบข้อมูลเรียบร้อย" });
      fetchData(); // โหลดข้อมูลใหม่
    }
  };

  // --- ฟังก์ชันลบประวัติคะแนน (Handle Delete History) ---
  const handleDeleteHistory = async (recordId: string) => {
    if (!confirm("ยืนยันการลบประวัติรายการนี้? คะแนนจะถูกคำนวณใหม่ทันที")) return;

    const { error } = await supabase.from('score_records').delete().eq('id', recordId);
    
    if (error) {
      toast({ title: "ลบประวัติไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ลบประวัติเรียบร้อย", description: "คะแนนถูกคำนวณใหม่แล้ว" });
      // รีโหลดประวัติ
      const { data } = await supabase.from('score_records').select('*').order('created_at', { ascending: false });
      if (data) setScoreRecords(data);
    }
  };

  // --- ฟังก์ชันบันทึกข้อมูลนักเรียน (CRUD) ---
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
      const { error: err } = await (supabase as any).from('motorcycles').update(payload).eq('id', studentForm.id);
      error = err;
    } else {
      const { error: err } = await (supabase as any).from('motorcycles').insert([payload]);
      error = err;
    }

    if (error) toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    else {
      toast({ title: isEditing ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ" });
      setCrudDialogOpen(false);
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
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> A4</Button>
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
          {/* Main Table */}
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
                            {student.name} <span className="text-[10px] text-slate-400 px-1 border rounded">{student.source === 'google' ? 'Google' : 'DB'}</span>
                          </TableCell>
                          <TableCell>{student.licensePlate}</TableCell>
                          <TableCell className="text-center font-bold"><span className={calculateTotalScore(student.licensePlate) < 100 ? 'text-red-500' : 'text-green-600'}>{calculateTotalScore(student.licensePlate)}</span></TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            {/* ปุ่มจัดการคะแนน */}
                            <Button size="sm" variant="outline" onClick={() => { setSelectedStudent(student); setScoreDialogOpen(true); }}><Plus className="h-4 w-4"/></Button>
                            
                            {/* ปุ่มแก้ไข/ลบ (เฉพาะ Super Admin และ ข้อมูลจาก DB) */}
                            {isSuperAdmin && student.source === 'supabase' && (
                              <>
                                <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => { setStudentForm(student); setIsEditing(true); setCrudDialogOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteStudent(student)}><Trash2 className="h-4 w-4"/></Button>
                              </>
                            )}
                            {/* ถ้าเป็น Google ลบไม่ได้ แต่แสดงปุ่มจางๆ ให้รู้ */}
                            {isSuperAdmin && student.source === 'google' && (
                              <Button size="sm" variant="ghost" className="text-slate-300 cursor-not-allowed" onClick={() => handleDeleteStudent(student)}><XCircle className="h-4 w-4"/></Button>
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

          {/* History & CRUD History */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b"><CardTitle className="text-md flex items-center text-slate-700"><History className="h-4 w-4 mr-2 text-indigo-500" /> ประวัติ 10 รายการล่าสุด</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                <div className="divide-y">
                  {scoreRecords.slice(0, 10).map((record) => (
                    <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-slate-800">{record.student_name}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${record.score_change < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{record.score_change > 0 ? '+' : ''}{record.score_change}</span>
                      </div>
                      <p className="text-xs text-slate-500">{record.reason}</p>
                      
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] text-slate-300">{new Date(record.created_at).toLocaleString('th-TH')}</p>
                        {/* ปุ่มลบประวัติ (เฉพาะ Super Admin) */}
                        {isSuperAdmin && (
                          <div className="hidden group-hover:block animate-in fade-in">
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => handleDeleteHistory(record.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
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

      {/* Modal - Score */}
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

      {/* Modal - Add/Edit Student */}
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

      {/* Printable Report (Official A4 Format - Centered Logo & Tidy Signatures) */}
      <div id="printable-report" className="hidden print:block bg-white text-black p-8 font-serif">
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
            
            #printable-report {
              font-family: 'Sarabun', sans-serif;
              line-height: 1.6;
              color: #000;
            }

            /* จัดหัวกระดาษ: โลโก้อยู่กลาง ข้อความอยู่กลาง */
            .a4-header {
              text-align: center;
              margin-bottom: 30px;
            }
            .school-logo {
              width: 100px; /* ปรับขนาดให้พอดี */
              height: auto;
              margin: 0 auto 15px auto; /* จัดกึ่งกลางและเว้นระยะห่างด้านล่าง */
              display: block;
            }
            .header-text h1 { font-size: 24px; font-weight: bold; margin: 0; }
            .header-text h2 { font-size: 20px; font-weight: bold; margin: 5px 0; }
            .header-text p { font-size: 16px; margin: 0; }

            /* ตารางข้อมูล */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #000;
              padding: 10px 5px;
              font-size: 14px;
              vertical-align: top;
            }
            th {
              background-color: #f0f0f0 !important; /* บังคับสีพื้นหลังตอนพิมพ์ */
              font-weight: bold;
              text-align: center;
              -webkit-print-color-adjust: exact; 
            }

            /* ส่วนลงชื่อ: จัดให้เป็นระเบียบ */
            .sign-section {
              margin-top: 60px;
              display: flex;
              justify-content: space-around; /* กระจายซ้ายขวาให้สมดุล */
              align-items: flex-start;
              page-break-inside: avoid; /* ป้องกันไม่ให้ส่วนนี้ถูกตัดข้ามหน้า */
            }
            .sign-box {
              text-align: center;
              width: 300px;
            }
            .sign-line {
              border-bottom: 1px dotted #000;
              display: inline-block;
              width: 200px; /* ความยาวเส้นลงชื่อ */
              height: 1px;
              margin: 30px auto 10px auto; /* ระยะห่างสำหรับเซ็น */
            }
            .position-text {
              margin-top: 5px;
              font-size: 14px;
            }

            /* ตั้งค่าหน้ากระดาษ */
            @media print {
              @page {
                size: A4;
                margin: 2cm; /* ขอบกระดาษมาตรฐานราชการ */
              }
              body * { visibility: hidden; }
              #printable-report, #printable-report * { visibility: visible; }
              #printable-report {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
              }
            }
          `}
        </style>

        {/* ส่วนหัวรายงาน (ปรับใหม่: โลโก้กลาง) */}
        <div className="a4-header">
          <img 
            src={aswLogo} 
            alt="School Logo" 
            className="school-logo" 
          />
          <div className="header-text">
            <h1>บันทึกข้อความ</h1>
            <h2>รายงานสรุปคะแนนความประพฤติ (ทะเบียนรถจักรยานยนต์)</h2>
            <p>โรงเรียนอาจสามารถวิทยา อำเภออาจสามารถ จังหวัดร้อยเอ็ด</p>
            <p>ประจำวันที่ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* ส่วนสรุปสถิติ */}
        <div className="mb-6 border-t border-b border-black py-4">
          <p className="text-lg">
            <strong>เรื่อง:</strong> สรุปสถิติการหักคะแนนความประพฤตินักเรียน (งานจราจร)
          </p>
          <div className="flex justify-between mt-2 text-md">
            <span>จำนวนรายการทั้งหมด: <strong>{scoreRecords.length}</strong> รายการ</span>
            <span>รวมคะแนนที่ถูกหัก: <strong className="text-red-600">-{stats.totalDeducted}</strong> คะแนน</span>
          </div>
        </div>

        {/* ตารางข้อมูล */}
        <table>
          <thead>
            <tr>
              <th style={{ width: '8%' }}>ลำดับ</th>
              <th style={{ width: '15%' }}>วัน/เวลา</th>
              <th style={{ width: '22%' }}>ชื่อ-สกุล</th>
              <th style={{ width: '10%' }}>ชั้น</th>
              <th style={{ width: '15%' }}>ทะเบียน</th>
              <th style={{ width: '10%' }}>คะแนน</th>
              <th style={{ width: '20%' }}>เหตุผล</th>
            </tr>
          </thead>
          <tbody>
            {scoreRecords.map((r, i) => (
              <tr key={i}>
                <td className="text-center">{i + 1}</td>
                <td className="text-center">{new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })} <br/> {new Date(r.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</td>
                <td>{r.student_name}</td>
                <td className="text-center">{r.student_class}</td>
                <td className="text-center">{r.license_plate}</td>
                <td className="text-center font-bold">
                  {r.score_change > 0 ? `+${r.score_change}` : r.score_change}
                </td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ส่วนลงชื่อ (ปรับใหม่: เป็นระเบียบ) */}
        <div className="sign-section">
          {/* ผู้รายงาน */}
          <div className="sign-box">
            <div className="sign-line"></div>
            <p>({user?.email?.split('@')[0] || '....................................'})</p>
            <p className="font-bold">ผู้รายงานข้อมูล</p>
            <p className="position-text">ตำแหน่ง ครูเวรประจำวัน</p>
          </div>

          {/* หัวหน้าฝ่าย */}
          <div className="sign-box">
            <div className="sign-line"></div>
            <p>(.......................................................)</p>
            <p className="font-bold">หัวหน้าฝ่ายกิจการนักเรียน</p>
            <p className="position-text">ผู้ตรวจทาน</p>
          </div>
        </div>
        
        {/* หมายเหตุท้ายกระดาษ */}
        <div className="mt-12 text-[10px] text-gray-500 text-right">
          พิมพ์จากระบบสารสนเทศ ASW-Moto เมื่อ {new Date().toLocaleString('th-TH')}
        </div>
      </div>
    </div>
  );
};

export default ScoreManagement;