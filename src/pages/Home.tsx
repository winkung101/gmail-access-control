import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Search, Settings, UserPlus, UserMinus, 
  ShieldCheck, Zap, Server, Database, Globe, Lock 
} from 'lucide-react'; 
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
    <div className="min-h-screen bg-[#f1f5f9] pb-12">
      {/* 1. Navbar ใหม่พร้อมโลโก้โรงเรียน */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              {/* ใส่ URL โลโก้โรงเรียนที่นี่ */}
              <img 
                src="https://img5.pic.in.th/file/secure-sv1/ASW-Logo-1.png" 
                alt="School Logo" 
                className="h-10 w-10 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 leading-none">ASW-Moto</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">ระบบสืบค้นทะเบียนรถจักรยานยนต์</span>
              </div>
            </div>
            <Button 
              onClick={handleSignOut} 
              variant="ghost" 
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-sm"
            >
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card: ข้อมูลผู้ใช้ */}
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 group">
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

          {/* Card: ลงทะเบียนรถ */}
          <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <CardTitle className="flex items-center text-slate-700">
                <FileText className="h-5 w-5 mr-2 text-indigo-500" />
                ลงทะเบียนรถ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 mb-4 text-sm">บันทึกข้อมูลรถจักรยานยนต์ใหม่เข้าระบบ</p>
              <Button onClick={() => navigate('/motorcycle-registration')} className="w-full bg-slate-900 hover:bg-blue-600 shadow-sm">เข้าสู่หน้าลงทะเบียน</Button>
            </CardContent>
          </Card>

          {/* Card: ระบบสืบค้น */}
          <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <CardTitle className="flex items-center text-slate-700">
                <Search className="h-5 w-5 mr-2 text-emerald-500" />
                สืบค้นทะเบียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 mb-4 text-sm">ตรวจสอบข้อมูลทะเบียนรถและเจ้าของ</p>
              <Button onClick={() => navigate('/motorcycle-search')} className="w-full" variant="outline">ค้นหาข้อมูลทะเบียน</Button>
            </CardContent>
          </Card>

          {/* Card: จัดการคะแนน (Admin+) */}
          {isAdminOrUpper && (
            <Card className="border-none shadow-md bg-white hover:shadow-xl transition-all duration-300 group overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-600">
                  <UserPlus className="h-5 w-5 mr-2 animate-pulse" />
                  จัดการคะแนน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 mb-4 text-sm">บันทึกแต้มความประพฤติ นักเรียนทำผิดกฏ</p>
                <Button onClick={() => toast({ title: "เร็วๆนี้", description: "กำลังอยู่ระหว่างการพัฒนาครับ" })} className="w-full bg-blue-600 hover:bg-blue-500">เปิดเมนูคะแนน</Button>
              </CardContent>
            </Card>
          )}

          {/* 2. ข่าวสารจากระบบพร้อมสถานะ System Health */}
          <Card className="md:col-span-2 overflow-hidden border-none shadow-lg bg-white">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
              <CardTitle className="text-white flex items-center text-lg font-medium">
                <span className="relative flex h-2 w-2 mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                ข่าวสารและสถานะระบบ
              </CardTitle>
              <div className="flex space-x-2">
                <span className="text-slate-400 text-[10px] font-mono bg-white/5 px-2 py-1 rounded border border-white/10">VER 2.0.4</span>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ฝั่งข้อความประกาศ */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <p className="text-slate-700 leading-relaxed text-sm">
                      <span className="font-bold text-blue-700">ประกาศ:</span> ยินดีต้อนรับเข้าสู่ระบบ ASW-Moto หากคุณพบปัญหาในการล็อกอินหรือการสืบค้นข้อมูล กรุณาแจ้งผู้ดูแลระบบผ่านช่องทางที่เป็นทางการ
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-slate-400 italic">
                    <Zap className="h-3 w-3 mr-1" /> อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')}
                  </div>
                </div>

                {/* ฝั่งสถานะระบบ (Health Check) */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                    <Server className="h-3 w-3 mr-1" /> System Health
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                      <div className="flex items-center text-xs font-medium text-slate-600">
                        <Globe className="h-3 w-3 mr-2 text-blue-500" /> Web Online
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                      <div className="flex items-center text-xs font-medium text-slate-600">
                        <Database className="h-3 w-3 mr-2 text-emerald-500" /> DB Cluster
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                      <div className="flex items-center text-xs font-medium text-slate-600">
                        <Lock className="h-3 w-3 mr-2 text-indigo-500" /> SSL/TLS Secure
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                      <div className="flex items-center text-xs font-medium text-slate-600">
                        <Server className="h-3 w-3 mr-2 text-orange-500" /> Cloud Hosting
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    </div>
                  </div>
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