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
  Users, AlertCircle, Clock, Printer
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ตัวเลือกเหตุผลมาตรฐาน
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
  name: string;
  class: string;
  brand: string;
  model: string;
  color: string;
  licensePlate: string;
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

const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
const SHEET_NAME = 'DATA';

const ScoreManagement = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scoreChange, setScoreChange] = useState<number>(0);
  
  // State ใหม่สำหรับเหตุผล
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [otherReason, setOtherReason] = useState('');
  
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAdmin = hasRole('admin') || hasRole('super_admin') || user?.email === 'winawathns11@gmail.com';

  const fixClassroom = (val: string) => {
    if (!val) return '-';
    const thaiMonths: { [key: string]: number } = {
      'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
      'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12
    };
    const parts = val.split('-');
    if (parts.length === 2 && thaiMonths[parts[1]]) {
      return `ม.${thaiMonths[parts[1]]}/${parts[0]}`;
    }
    return val;
  };

  const fetchStudents = async () => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      const response = await fetch(url);
      const text = await response.text();
      const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
      if (!jsonString) return;
      const json = JSON.parse(jsonString[1]);
      const rows = json.table.rows;
      const parsedStudents = rows.slice(1).map((row: any) => ({
        name: row.c[1]?.v || '',
        class: fixClassroom(row.c[2]?.v || ''),
        brand: row.c[3]?.v || '',
        model: row.c[4]?.v || '',
        color: row.c[5]?.v || '',
        licensePlate: row.c[6]?.v || '',
      })).filter((s: Student) => s.name);
      setStudents(parsedStudents);
    } catch (error) { console.error(error); }
  };

  const fetchScoreRecords = async () => {
    const { data } = await supabase.from('score_records').select('*').order('created_at', { ascending: false });
    setScoreRecords(data || []);
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/home');
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchScoreRecords()]);
      setLoading(false);
    };
    if (!authLoading && isAdmin) loadData();
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

    if (!selectedStudent || scoreChange === 0 || !finalReason.trim()) {
      toast({ title: 'ข้อมูลไม่ครบ', description: 'กรุณากรอกคะแนนและเหตุผล', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('score_records').insert({
      student_name: selectedStudent.name,
      student_class: selectedStudent.class,
      license_plate: selectedStudent.licensePlate,
      score_change: scoreChange,
      reason: finalReason.trim(),
      recorded_by: user?.id
    });
    if (error) {
      toast({ title: 'บันทึกไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'บันทึกคะแนนสำเร็จ' });
      setDialogOpen(false);
      setScoreChange(0);
      setOtherReason('');
      fetchScoreRecords();
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            #printable-report { 
              display: block !important; 
              background: white;
              width: 100%;
            }
            body { background: white; }
          }
        `}
      </style>

      {/* Navbar - no-print */}
      <nav className="bg-white border-b sticky top-0 z-50 px-6 h-16 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')}><ArrowLeft className="h-4 w-4 mr-2" /> หน้าแรก</Button>
          <h1 className="font-bold text-slate-800">ระบบจัดการคะแนน</h1>
        </div>
        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200" onClick={handlePrintReport}>
          <Printer className="h-4 w-4 mr-2" /> พิมพ์รายงาน A4
        </Button>
      </nav>

      {/* Content - no-print */}
      <div className="max-w-7xl mx-auto px-6 pt-8 space-y-8 no-print">
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
              <div><p className="text-slate-400 text-sm">คะแนนที่ถูกหักรวม</p><h3 className="text-3xl font-bold text-red-600">-{stats.totalDeducted}</h3></div>
              <AlertCircle className="h-10 w-10 text-red-500 opacity-20" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg flex items-center text-slate-700"><Search className="h-5 w-5 mr-2 text-blue-500" /> ค้นหาเพื่อจัดการคะแนน</CardTitle></CardHeader>
              <CardContent>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="ค้นหาชื่อ, ห้อง หรือทะเบียน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-12" /></div>
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50"><TableRow><TableHead>ชื่อ-สกุล</TableHead><TableHead>ชั้น</TableHead><TableHead className="text-center">คะแนน</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredStudents.slice(0, 8).map((student, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell className="text-center font-bold"><span className={calculateTotalScore(student.licensePlate) < 100 ? 'text-red-500' : 'text-green-600'}>{calculateTotalScore(student.licensePlate)}</span></TableCell>
                          <TableCell className="text-right">
                            <Dialog open={dialogOpen && selectedStudent?.licensePlate === student.licensePlate} onOpenChange={setDialogOpen}>
                              <DialogTrigger asChild><Button size="sm" className="bg-slate-900" onClick={() => setSelectedStudent(student)}>จัดการคะแนน</Button></DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>บันทึกคะแนน: {student.name}</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">แต้ม (+/-)</label>
                                    <Input type="number" value={scoreChange} onChange={e => setScoreChange(Number(e.target.value))} />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">เหตุผล (เลือกจากรายการ)</label>
                                    <select 
                                      className="w-full h-10 px-3 rounded-md border border-slate-200 mt-1 text-sm"
                                      value={selectedReason}
                                      onChange={(e) => setSelectedReason(e.target.value)}
                                    >
                                      {REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  </div>
                                  {selectedReason === "อื่นๆ (ระบุเอง)" && (
                                    <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase">ระบุเหตุผลอื่นๆ</label>
                                      <Textarea value={otherReason} onChange={e => setOtherReason(e.target.value)} className="mt-1" placeholder="พิมพ์เหตุผลที่นี่..." />
                                    </div>
                                  )}
                                  <Button className="w-full bg-blue-600" onClick={handleSaveScore}>บันทึกข้อมูลคะแนน</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
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
                      <div className="flex justify-between items-start mb-1"><span className="font-bold text-sm">{record.student_name}</span><span className={`text-xs font-bold px-2 py-0.5 rounded ${record.score_change < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{record.score_change > 0 ? '+' : ''}{record.score_change}</span></div>
                      <p className="text-xs text-slate-500">{record.reason}</p>
                      <p className="text-[10px] text-slate-300 mt-2">{new Date(record.created_at).toLocaleString('th-TH')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* --- ส่วนที่เป็นรายงานสำหรับพิมพ์ A4 (Hidden on Web, Visible on Print) --- */}
      <div id="printable-report" className="hidden p-8 bg-white text-black">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">รายงานสรุปคะแนนความประพฤติ (ทะเบียนรถจักรยานยนต์)</h1>
          <h2 className="text-lg">โรงเรียนอาจสามารถวิทยา</h2>
          <p className="text-sm">พิมพ์วันที่ {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8 text-center border-y border-black py-4">
          <div><p className="font-bold">เคสทั้งหมดวันนี้</p><p className="text-xl">{stats.todayCases} รายการ</p></div>
          <div><p className="font-bold">คะแนนหักสะสมรวม</p><p className="text-xl">-{stats.totalDeducted} คะแนน</p></div>
          <div><p className="font-bold">เจ้าหน้าที่ผู้พิมพ์</p><p className="text-sm">{user?.email}</p></div>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2">วันที่/เวลา</th>
              <th className="border border-black p-2">ชื่อ-นามสกุล</th>
              <th className="border border-black p-2">ชั้น</th>
              <th className="border border-black p-2">ทะเบียน</th>
              <th className="border border-black p-2">คะแนน</th>
              <th className="border border-black p-2">เหตุผล</th>
            </tr>
          </thead>
          <tbody>
            {scoreRecords.map((record) => (
              <tr key={record.id}>
                <td className="border border-black p-2">{new Date(record.created_at).toLocaleString('th-TH')}</td>
                <td className="border border-black p-2">{record.student_name}</td>
                <td className="border border-black p-2 text-center">{record.student_class}</td>
                <td className="border border-black p-2 text-center">{record.license_plate}</td>
                <td className="border border-black p-2 text-center font-bold">{record.score_change > 0 ? '+' : ''}{record.score_change}</td>
                <td className="border border-black p-2">{record.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-20 flex justify-between px-10">
          <div className="text-center"><p className="mb-16">ลงชื่อ..........................................................</p><p>ผู้รายงาน</p></div>
          <div className="text-center"><p className="mb-16">ลงชื่อ..........................................................</p><p>หัวหน้าฝ่ายกิจการนักเรียน</p></div>
        </div>
      </div>
    </div>
  );
};

export default ScoreManagement;