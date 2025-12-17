import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Minus, Search, History, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  const [reason, setReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAdmin = hasRole('admin') || hasRole('super_admin') || user?.email === 'winawathns11@gmail.com';

  // ฟังก์ชันแก้ปัญหาห้องเรียนที่เป็นวันที่ (6-ม.ค. -> ม.1/6)
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
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchScoreRecords = async () => {
    const { data } = await supabase
      .from('score_records')
      .select('*')
      .order('created_at', { ascending: false });
    setScoreRecords(data || []);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!authLoading && !isAdmin) navigate('/home');

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchScoreRecords()]);
      setLoading(false);
    };
    if (!authLoading && isAdmin) loadData();
  }, [authLoading, user, isAdmin]);

  const calculateTotalScore = (licensePlate: string) => {
    const baseScore = 100;
    const studentRecords = scoreRecords.filter(r => r.license_plate === licensePlate);
    return baseScore + studentRecords.reduce((sum, r) => sum + r.score_change, 0);
  };

  const handleSaveScore = async () => {
    if (!selectedStudent || scoreChange === 0 || !reason.trim()) {
      toast({ title: 'ข้อมูลไม่ครบ', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('score_records').insert({
      student_name: selectedStudent.name,
      student_class: selectedStudent.class,
      license_plate: selectedStudent.licensePlate,
      score_change: scoreChange,
      reason: reason.trim(),
      recorded_by: user?.id // ส่ง UUID เสมอ
    });

    if (error) {
      toast({ title: 'บันทึกไม่สำเร็จ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'บันทึกสำเร็จ' });
      setDialogOpen(false);
      setScoreChange(0);
      setReason('');
      fetchScoreRecords();
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')}><ArrowLeft className="mr-2 h-4" /> กลับ</Button>
          <h1 className="text-xl font-bold">จัดการคะแนนความประพฤติ</h1>
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="ค้นหาชื่อ หรือทะเบียน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>ชื่อ-สกุล</TableHead>
                <TableHead>ชั้น</TableHead>
                <TableHead>ทะเบียน</TableHead>
                <TableHead className="text-center">คะแนน</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.class}</TableCell>
                  <TableCell>{student.licensePlate}</TableCell>
                  <TableCell className="text-center font-bold">
                    <span className={calculateTotalScore(student.licensePlate) < 100 ? 'text-red-500' : 'text-green-600'}>
                      {calculateTotalScore(student.licensePlate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog open={dialogOpen && selectedStudent?.licensePlate === student.licensePlate} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedStudent(student)}><Plus className="h-3 w-3 mr-1" /><Minus className="h-3 w-3" /></Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>จัดการแต้ม: {student.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <Input type="number" placeholder="คะแนน เช่น -10 หรือ 5" value={scoreChange} onChange={e => setScoreChange(Number(e.target.value))} />
                          <Textarea placeholder="ระบุเหตุผล" value={reason} onChange={e => setReason(e.target.value)} />
                          <Button className="w-full" onClick={handleSaveScore}>ยืนยันการบันทึก</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default ScoreManagement;