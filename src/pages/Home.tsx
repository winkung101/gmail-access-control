import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Settings, UserPlus, UserMinus } from 'lucide-react'; 
import { useToast } from '@/components/ui/use-toast';

const Home = () => {
  const { user, profile, signOut, loading: authLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

  const getRoleDisplay = () => {
    // เงื่อนไขพิเศษตามอีเมล
    if (user?.email === 'student_68@atsamat.ac.th') return 'สภานักเรียน';
    if (user?.email === 'sad@atsamat.ac.th') return 'ฝ่ายกิจการนักเรียน';
    
    // Hardcode แสดงผลสำหรับเจ้าของระบบ
    if (user?.email === 'winawathns11@gmail.com') return 'ผู้ดูแลระบบสูงสุด';

    // ตรวจสอบจากระบบ Role จริง
    if (hasRole('super_admin')) return 'ผู้ดูแลระบบ';
    if (hasRole('admin')) return 'แอดมิน';
    return 'ผู้ใช้ทั่วไป';
  };

  // เช็คสิทธิ์ตั้งแต่ Admin ขึ้นไป
  const isAdminOrUpper = hasRole('admin') || hasRole('super_admin') || user?.email === 'winawathns11@gmail.com';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">หน้าหลัก</h1>
          <Button onClick={handleSignOut} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            ออกจากระบบ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: ข้อมูลผู้ใช้ */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลผู้ใช้</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>ชื่อ:</strong> {profile?.full_name || '-'}</p>
                <p><strong>อีเมล:</strong> {user?.email}</p>
                <p><strong>บทบาท:</strong> {getRoleDisplay()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card: ลงทะเบียนรถ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                ลงทะเบียนรถจักรยานยนต์
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 text-sm">
                ลงทะเบียนรถจักรยานยนต์ใหม่ผ่านแบบฟอร์มออนไลน์เพื่อรับสติ๊กเกอร์
              </p>
              <Button 
                onClick={() => navigate('/motorcycle-registration')}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                ลงทะเบียนใหม่
              </Button>
            </CardContent>
          </Card>

          {/* Card: ระบบสืบค้น */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                ระบบสืบค้นทะเบียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 text-sm">
                ค้นหาข้อมูลทะเบียนรถจักรยานยนต์ที่ลงทะเบียนไว้ในระบบ
              </p>
              <Button 
                onClick={() => navigate('/motorcycle-search')}
                className="w-full"
                variant="outline"
              >
                <Search className="h-4 w-4 mr-2" />
                ค้นหาทะเบียน
              </Button>
            </CardContent>
          </Card>

          {/* Card: จัดการคะแนน (เห็นเฉพาะ Admin/Super Admin) */}
          {isAdminOrUpper && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <UserPlus className="h-5 w-5 mr-2" />
                  จัดการคะแนนนักเรียน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 text-sm">
                  ระบบเพิ่มหรือลดคะแนนความประพฤติสำหรับนักเรียนที่ทำผิดกฎ
                </p>
                <Button 
                  onClick={() => toast({
                    title: "ระบบกำลังพัฒนา",
                    description: "เมนูจัดการแต้มจะเปิดใช้งานเร็วๆ นี้",
                  })}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  เพิ่ม / ลด แต้มนักเรียน
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card: เมนูแอดมิน (เฉพาะ Super Admin) */}
          {hasRole('super_admin') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  เมนูผู้ดูแลระบบ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 text-sm">
                  จัดการสิทธิ์ผู้ใช้งานและตรวจสอบข้อมูลภาพรวมของระบบ
                </p>
                <Button 
                  onClick={() => navigate('/admin')}
                  className="w-full"
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  จัดการผู้ใช้
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>ประกาศ/ประชาสัมพันธ์</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                ยินดีต้อนรับเข้าสู่ระบบ ASW-Moto หากพบปัญหาการใช้งาน กรุณาติดต่อฝ่ายกิจการนักเรียน
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;