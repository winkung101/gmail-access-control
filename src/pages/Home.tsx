import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Settings, UserPlus, UserMinus, ShieldCheck, Zap } from 'lucide-react'; 
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">กำลังเตรียมข้อมูล...</p>
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

  const isAdminOrUpper = hasRole('admin') || hasRole('super_admin') || user?.email === 'winawathns11@gmail.com';

  return (
    <div className="min-h-screen bg-[#f1f5f9] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ASW-Moto Control</h1>
          </div>
          <Button 
            onClick={handleSignOut} 
            variant="ghost" 
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
          >
            ออกจากระบบ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card: ข้อมูลผู้ใช้ - เน้นความเรียบง่าย สะอาดตา */}
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group">
            <div className="h-1 bg-slate-200 group-hover:bg-blue-500 transition-colors duration-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-700 flex items-center text-lg">
                <ShieldCheck className="h-5 w-5 mr-2 text-blue-500" />
                สถานะผู้ใช้งาน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-slate-600">
                <p className="flex justify-between border-b border-slate-50 py-1">
                  <span className="text-slate-400">ชื่อ:</span> 
                  <span className="font-medium text-slate-800">{profile?.full_name || '-'}</span>
                </p>
                <p className="flex justify-between border-b border-slate-50 py-1">
                  <span className="text-slate-400">อีเมล:</span> 
                  <span className="text-sm">{user?.email}</span>
                </p>
                <p className="flex justify-between py-1">
                  <span className="text-slate-400">บทบาท:</span> 
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase tracking-wider">
                    {getRoleDisplay()}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card: ลงทะเบียนรถ - มี Hover Scale เล็กน้อย */}
          <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <CardTitle className="flex items-center text-slate-700">
                <FileText className="h-5 w-5 mr-2 text-indigo-500 group-hover:rotate-12 transition-transform" />
                ลงทะเบียนรถ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 mb-4 text-sm">
                บันทึกข้อมูลรถจักรยานยนต์ใหม่เข้าระบบเพื่อขอรับสติ๊กเกอร์ยืนยัน
              </p>
              <Button 
                onClick={() => navigate('/motorcycle-registration')}
                className="w-full bg-slate-900 hover:bg-blue-600 transition-colors duration-300 shadow-sm"
              >
                เข้าสู่หน้าลงทะเบียน
              </Button>
            </CardContent>
          </Card>

          {/* Card: ระบบสืบค้น - ใช้ขอบมนและเส้นประเบาๆ */}
          <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <CardTitle className="flex items-center text-slate-700">
                <Search className="h-5 w-5 mr-2 text-emerald-500 group-hover:scale-110 transition-transform" />
                สืบค้นทะเบียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 mb-4 text-sm">
                ตรวจสอบข้อมูลทะเบียนรถและเจ้าของผ่านระบบฐานข้อมูลส่วนกลาง
              </p>
              <Button 
                onClick={() => navigate('/motorcycle-search')}
                className="w-full"
                variant="outline"
              >
                ค้นหาข้อมูลทะเบียน
              </Button>
            </CardContent>
          </Card>

          {/* Card: จัดการคะแนน (Admin+) - ใช้สีสันให้ดูเด่นแต่ซอฟต์ */}
          {isAdminOrUpper && (
            <Card className="border-none shadow-md bg-white hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <UserPlus className="h-24 w-24 -mr-8 -mt-8" />
              </div>
              <CardHeader>
                <CardTitle className="flex items-center text-blue-600">
                  <UserPlus className="h-5 w-5 mr-2 animate-pulse" />
                  จัดการคะแนน
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-slate-500 mb-4 text-sm">
                  เครื่องมือสำหรับฝ่ายปกครอง: บันทึกความประพฤติ เพิ่ม/ลด แต้ม
                </p>
                <Button 
                  onClick={() => toast({
                    title: "Coming Soon",
                    description: "ระบบกำลังเตรียมการจัดทำหน้าจอจัดการคะแนน",
                  })}
                  className="w-full bg-blue-600 hover:bg-blue-500"
                >
                  เปิดเมนูคะแนน
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card: เมนูแอดมิน - เรียบหรูสไตล์เครื่องมือระบบ */}
          {hasRole('super_admin') && (
            <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-700">
                  <Settings className="h-5 w-5 mr-2" />
                  แผงควบคุมระบบ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 mb-4 text-sm">
                  จัดการสิทธิ์ผู้ใช้งานและตั้งค่าการทำงานเบื้องต้นของแอปพลิเคชัน
                </p>
                <Button 
                  onClick={() => navigate('/admin')}
                  className="w-full"
                  variant="secondary"
                >
                  จัดการผู้ใช้งาน
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ประกาศจากระบบ - ลูกเล่นจัดเต็มเป็นตัวจบ */}
          <Card className="md:col-span-2 overflow-hidden border-none shadow-lg">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex justify-between items-center">
              <CardTitle className="text-white flex items-center text-lg font-medium">
                <span className="relative flex h-2 w-2 mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                </span>
                ข่าวสารจากระบบ
              </CardTitle>
              <span className="text-slate-400 text-[10px] font-mono tracking-widest bg-white/10 px-2 py-1 rounded">V2.0.4 - STABLE</span>
            </div>
            <CardContent className="bg-white p-6">
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex flex-shrink-0 bg-blue-50 p-3 rounded-xl">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                    ยินดีต้อนรับเข้าสู่ระบบ <span className="font-bold text-slate-900 underline decoration-blue-500 decoration-2">ASW-Moto</span> 
                    <br />
                    <span className="text-slate-500 text-sm">
                      หากพบข้อสงสัยในการใช้งาน หรือระบบทำงานผิดปกติ สามารถติดต่อฝ่ายสารสนเทศได้ทันที
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;