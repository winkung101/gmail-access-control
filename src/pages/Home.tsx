import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Settings, PlusMinus } from 'lucide-react'; 
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

  const getRoleDisplay = () => {
    if (user?.email === 'student_68@atsamat.ac.th') return 'สภานักเรียน';
    if (user?.email === 'sad@atsamat.ac.th') return 'ฝ่ายกิจการนักเรียน';
    if (user?.email === 'winawathns11@gmail.com') return 'ผู้ดูแลระบบสูงสุด';

    if (hasRole('super_admin')) return 'ผู้ดูแลระบบ';
    if (hasRole('admin')) return 'แอดมิน';
    return 'ผู้ใช้ทั่วไป';
  };

  // ตรวจสอบว่าเป็น Admin หรือ Super Admin หรือไม่
  const isAdminOrUpper = hasRole('admin') || hasRole('super_admin');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">หน้าหลัก</h1>
          <Button onClick={handleSignOut} variant="outline">
            ออกจากระบบ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                ลงทะเบียนรถจักรยานยนต์
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                ลงทะเบียนรถจักรยานยนต์ใหม่ผ่านแบบฟอร์มออนไลน์
              </p>
              <Button 
                onClick={() => navigate('/motorcycle-registration')}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                ลงทะเบียนรถจักรยานยนต์
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                ระบบสืบค้นทะเบียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                ค้นหาข้อมูลทะเบียนรถจักรยานยนต์ในระบบ
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

          {/* แสดงเมนูจัดการคะแนน ให้เห็นตั้งแต่ Admin ขึ้นไป */}
          {isAdminOrUpper && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <PlusMinus className="h-5 w-5 mr-2" />
                  จัดการคะแนน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  จัดการ เพิ่ม หรือ ลด คะแนนความประพฤตินักเรียน
                </p>
                <Button 
                  onClick={() => toast({
                    title: "ระบบกำลังพัฒนา",
                    description: "เมนูเพิ่ม/ลดแต้ม จะเปิดใช้งานในเวอร์ชันถัดไป",
                  })}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <PlusMinus className="h-4 w-4 mr-2" />
                  เพิ่ม / ลด แต้มนักเรียน
                </Button>
              </CardContent>
            </Card>
          )}

          {hasRole('super_admin') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  เมนูผู้ดูแลระบบ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  จัดการสิทธิ์ผู้ใช้งานและตั้งค่าระบบเบื้องต้น
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

          <Card>
            <CardHeader>
              <CardTitle>ยินดีต้อนรับ!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                คุณได้เข้าสู่ระบบสำเร็จแล้ว ระบบจะจำการเข้าสู่ระบบของคุณไว้ 
                จนกว่าคุณจะออกจากระบบ
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;