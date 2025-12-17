import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Minus, Search, History } from 'lucide-react';
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
  timestamp: string;
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

// ใส่ Google Sheet ID ตรงนี้
const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
const SHEET_NAME = 'DATA'; // ชื่อ sheet สำหรับ Google Form

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
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const isAdmin = hasRole('admin') || hasRole('super_admin');

  // ดึงข้อมูลจาก Google Sheet
  const fetchStudents = async () => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
      const response = await fetch(url);
      const text = await response.text();
      
      // Parse Google Sheets JSON response
      const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
      if (!jsonString || !jsonString[1]) {
        throw new Error('Invalid response format');
      }
      
      const json = JSON.parse(jsonString[1]);
      const rows = json.table.rows;
      
      const parsedStudents: Student[] = rows.slice(1).map((row: any) => ({
        timestamp: row.c[0]?.v || '',
        name: row.c[1]?.v || '',
        class: row.c[2]?.v || '',
        brand: row.c[3]?.v || '',
        model: row.c[4]?.v || '',
        color: row.c[5]?.v || '',
        licensePlate: row.c[6]?.v || '',
      })).filter((s: Student) => s.name);

      setStudents(parsedStudents);
    } catch (error) {
      console.error('Error fetching Google Sheet:', error);
      toast({
        title: 'ไม่สามารถดึงข้อมูลได้',
        description: 'กรุณาตรวจสอบ Google Sheet ID และให้แน่ใจว่า Sheet เป็น Public',
        variant: 'destructive',
      });
    }
  };

  // ดึงข้อมูลคะแนนจาก Supabase
  const fetchScoreRecords = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('score_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching score records:', error);
      } else {
        setScoreRecords(data || []);
      }
    } catch (err) {
      console.error('Table score_records may not exist yet:', err);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!authLoading && !isAdmin) {
      toast({
        title: 'ไม่มีสิทธิ์เข้าถึง',
        description: 'เฉพาะ Admin เท่านั้นที่สามารถเข้าถึงหน้านี้ได้',
        variant: 'destructive',
      });
      navigate('/home');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchScoreRecords()]);
      setLoading(false);
    };

    if (!authLoading && isAdmin) {
      loadData();
    }
  }, [authLoading, user, isAdmin]);

  // คำนวณคะแนนรวมของนักเรียน
  const calculateTotalScore = (licensePlate: string): number => {
    const baseScore = 100; // คะแนนเริ่มต้น
    const studentRecords = scoreRecords.filter(r => r.license_plate === licensePlate);
    const totalChange = studentRecords.reduce((sum, r) => sum + r.score_change, 0);
    return baseScore + totalChange;
  };

  // บันทึกการเปลี่ยนแปลงคะแนน
  const handleSaveScore = async () => {
    if (!selectedStudent || scoreChange === 0 || !reason.trim()) {
      toast({
        title: 'ข้อมูลไม่ครบ',
        description: 'กรุณากรอกคะแนนและเหตุผล',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await (supabase as any).from('score_records').insert({
      student_name: selectedStudent.name,
      student_class: selectedStudent.class,
      license_plate: selectedStudent.licensePlate,
      score_change: scoreChange,
      reason: reason.trim(),
      recorded_by: user?.email || 'Unknown',
    });

    if (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'บันทึกสำเร็จ',
        description: `${scoreChange > 0 ? 'เพิ่ม' : 'หัก'}คะแนน ${Math.abs(scoreChange)} คะแนน`,
      });
      setDialogOpen(false);
      setScoreChange(0);
      setReason('');
      setSelectedStudent(null);
      fetchScoreRecords();
    }
  };

  // ประวัติคะแนนของนักเรียน
  const getStudentHistory = (licensePlate: string) => {
    return scoreRecords.filter(r => r.license_plate === licensePlate);
  };

  // กรองข้อมูลตามคำค้นหา
  const filteredStudents = students.filter(
    s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับหน้าหลัก
          </Button>
          <h1 className="text-2xl font-bold text-foreground">ระบบจัดการคะแนน</h1>
          <div className="w-24" />
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, ห้อง, หรือทะเบียนรถ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle>รายชื่อนักเรียน ({filteredStudents.length} คน)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-สกุล</TableHead>
                    <TableHead>ชั้น</TableHead>
                    <TableHead>ทะเบียนรถ</TableHead>
                    <TableHead>รุ่น/สี</TableHead>
                    <TableHead className="text-center">คะแนนรวม</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const totalScore = calculateTotalScore(student.licensePlate);
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell>{student.licensePlate}</TableCell>
                          <TableCell>
                            {student.brand} {student.model} ({student.color})
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`font-bold ${
                                totalScore >= 100
                                  ? 'text-green-600'
                                  : totalScore >= 50
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {totalScore}
                            </span>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {/* ประวัติ */}
                            <Dialog open={historyDialogOpen && selectedStudent?.licensePlate === student.licensePlate} onOpenChange={(open) => {
                              setHistoryDialogOpen(open);
                              if (!open) setSelectedStudent(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedStudent(student)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>ประวัติคะแนน - {student.name}</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-96 overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>วันที่</TableHead>
                                        <TableHead>คะแนน</TableHead>
                                        <TableHead>เหตุผล</TableHead>
                                        <TableHead>ผู้บันทึก</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {getStudentHistory(student.licensePlate).length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            ยังไม่มีประวัติ
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        getStudentHistory(student.licensePlate).map(record => (
                                          <TableRow key={record.id}>
                                            <TableCell>
                                              {new Date(record.created_at).toLocaleDateString('th-TH')}
                                            </TableCell>
                                            <TableCell>
                                              <span
                                                className={
                                                  record.score_change > 0
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                }
                                              >
                                                {record.score_change > 0 ? '+' : ''}
                                                {record.score_change}
                                              </span>
                                            </TableCell>
                                            <TableCell>{record.reason}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                              {record.recorded_by}
                                            </TableCell>
                                          </TableRow>
                                        ))
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* เพิ่ม/หักคะแนน */}
                            <Dialog open={dialogOpen && selectedStudent?.licensePlate === student.licensePlate} onOpenChange={(open) => {
                              setDialogOpen(open);
                              if (!open) {
                                setSelectedStudent(null);
                                setScoreChange(0);
                                setReason('');
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setSelectedStudent(student)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>จัดการคะแนน - {student.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <label className="text-sm font-medium">คะแนน (+ เพิ่ม / - หัก)</label>
                                    <Input
                                      type="number"
                                      value={scoreChange}
                                      onChange={e => setScoreChange(Number(e.target.value))}
                                      placeholder="เช่น -5 หรือ +10"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">เหตุผล</label>
                                    <Textarea
                                      value={reason}
                                      onChange={e => setReason(e.target.value)}
                                      placeholder="ระบุเหตุผลในการเพิ่ม/หักคะแนน"
                                      rows={3}
                                    />
                                  </div>
                                  <Button onClick={handleSaveScore} className="w-full">
                                    บันทึก
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScoreManagement;
