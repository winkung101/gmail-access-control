import { useState, useEffect } from 'react';
import aswLogo from '@/assets/asw-logo.png';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Search, UserPlus, ShieldCheck, Zap, Server, 
  Database, Globe, Lock, Edit3, X, AlertTriangle, TrendingUp, Printer // เพิ่ม Printer ตรงนี้
} from 'lucide-react'; 
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const Home = () => {
  const { user, profile, signOut, loading: authLoading, hasRole } = useAuth();
  const navigate = useNavigate();

  // State
  const [announcement, setAnnouncement] = useState('กำลังโหลดประกาศล่าสุด...');
  const [announcementData, setAnnouncementData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showPopup, setShowPopup] = useState(false);
  const [features, setFeatures] = useState<any>({});
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('announcements')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .maybeSingle();

        if (data) {
          setAnnouncement(data.content);
          setAnnouncementData(data);
          setLastUpdate(new Date(data.updated_at).toLocaleDateString('th-TH'));
          const hideFlag = localStorage.getItem(`hide_announcement_v${data.version}`);
          if (!hideFlag) setShowPopup(true);
        }
      } catch (err: any) { console.error(err); }
    };

    const fetchFeatures = async () => {
      try {
        const { data } = await (supabase as any).from('feature_flags').select('*');
        if (data) {
          const featureMap = data.reduce((acc: any, curr: any) => {
            acc[curr.feature_key] = curr;
            return acc;
          }, {});
          setFeatures(featureMap);
        }
      } catch (err) { console.error(err); }
    };

    fetchAnnouncement();
    fetchFeatures();
  }, []);

  const handleCloseSimple = () => setShowPopup(false);
  const handleClosePermanently = () => {
    if (announcementData) localStorage.setItem(`hide_announcement_v${announcementData.version}`, 'true');
    setShowPopup(false);
  };

  const getRoleDisplay = () => {
    if (user?.email === 'student_68@atsamat.ac.th') return 'สภานักเรียน';
    if (user?.email === 'sad@atsamat.ac.th') return 'ฝ่ายกิจการนักเรียน';
    if (hasRole('super_admin') || user?.email === 'winawathns11@gmail.com') return 'ผู้ดูแลระบบสูงสุด';
    if (hasRole('admin')) return 'แอดมิน';
    return 'ผู้ใช้ทั่วไป';
  };

  const isAdminOrUpper = hasRole('admin') || hasRole('super_admin') || user?.email === 'winawathns11@gmail.com';
  const isSuperAdmin = hasRole('super_admin') || user?.email === 'winawathns11@gmail.com';

  const handleNavigate = (path: string, featureKey: string) => {
    const feature = features[featureKey];
    if (!feature || feature.is_enabled || isSuperAdmin) {
      navigate(path);
    } else {
      setBlockedMessage(feature.message || 'ระบบปิดปรับปรุงชั่วคราว');
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-12">
      
      {/* Popups */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
            <h2 className="text-lg font-bold flex items-center"><Zap className="h-5 w-5 mr-2 text-yellow-400 fill-yellow-400" /> ประกาศจากระบบ</h2>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={handleCloseSimple}><X className="h-5 w-5" /></Button>
          </div>
          <div className="bg-white overflow-y-auto max-h-[80vh]">
            {announcementData?.image_url && <div className="aspect-square w-full bg-slate-100 relative"><img src={announcementData.image_url} className="w-full h-full object-cover" /></div>}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100"><p className="text-slate-700 whitespace-pre-wrap text-sm">{announcementData?.content || announcement}</p></div>
              <div className="flex flex-col gap-2"><Button onClick={handleCloseSimple} className="w-full bg-slate-900">รับทราบ</Button><button onClick={handleClosePermanently} className="text-xs text-slate-400 underline">ไม่ต้องแสดงอีก</button></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blockedMessage} onOpenChange={() => setBlockedMessage(null)}>
        <DialogContent className="sm:max-w-md border-none shadow-xl rounded-2xl">
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center animate-pulse"><AlertTriangle className="h-8 w-8 text-red-600" /></div>
            <h2 className="text-xl font-bold text-slate-900">ขออภัย ระบบปิดให้บริการชั่วคราว</h2>
            <p className="text-slate-600">{blockedMessage}</p>
            <Button className="w-full bg-slate-900" onClick={() => setBlockedMessage(null)}>รับทราบ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/home')}>
              <img src={aswLogo} className="h-10 w-10 object-contain" />
              <div className="flex flex-col"><span className="text-lg font-bold text-slate-900 leading-none">ASW-Moto</span><span className="text-[10px] text-slate-500 font-medium uppercase">ระบบสืบค้นทะเบียนรถ</span></div>
            </div>
            <Button onClick={handleSignOut} variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-sm">ออกจากระบบ</Button>
          </div>
        </div>
      </nav>

      {/* Main Grid */}
      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. User Info */}
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow group">
            <div className="h-1 bg-slate-200 group-hover:bg-blue-500 transition-colors" />
            <CardHeader className="pb-2"><CardTitle className="text-slate-700 flex items-center text-lg"><ShieldCheck className="h-5 w-5 mr-2 text-blue-500" /> สถานะผู้ใช้งาน</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 text-slate-600">
                <p className="flex justify-between border-b py-1"><span className="text-slate-400">ชื่อ:</span> <span className="font-medium text-slate-800">{profile?.full_name || '-'}</span></p>
                <p className="flex justify-between border-b py-1"><span className="text-slate-400">อีเมล:</span> <span className="text-sm">{user?.email}</span></p>
                <p className="flex justify-between py-1"><span className="text-slate-400">บทบาท:</span> <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase">{getRoleDisplay()}</span></p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Registration */}
          <Card className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden">
            {features['registration'] && !features['registration'].is_enabled && !isSuperAdmin && <div className="absolute top-3 right-3 px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded">CLOSED</div>}
            <CardHeader><CardTitle className="flex items-center text-slate-700"><FileText className={`h-5 w-5 mr-2 ${features['registration']?.is_enabled ? 'text-indigo-500' : 'text-slate-400'}`} /> ลงทะเบียนรถ</CardTitle></CardHeader>
            <CardContent>
              <p className="text-slate-500 mb-4 text-sm">บันทึกข้อมูลรถจักรยานยนต์ใหม่เข้าระบบ</p>
              <Button onClick={() => handleNavigate('/motorcycle-registration', 'registration')} className={`w-full shadow-sm ${features['registration']?.is_enabled || isSuperAdmin ? 'bg-slate-900 hover:bg-blue-600' : 'bg-slate-200 text-slate-400 hover:bg-slate-200'}`}>เข้าสู่หน้าลงทะเบียน</Button>
            </CardContent>
          </Card>

          {/* 3. Search */}
          <Card className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative">
            {features['search'] && !features['search'].is_enabled && !isSuperAdmin && <div className="absolute top-3 right-3 px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded">MAINTENANCE</div>}
            <CardHeader><CardTitle className="flex items-center text-slate-700"><Search className={`h-5 w-5 mr-2 ${features['search']?.is_enabled ? 'text-emerald-500' : 'text-slate-400'}`} /> สืบค้นทะเบียน</CardTitle></CardHeader>
            <CardContent>
              <p className="text-slate-500 mb-4 text-sm">ตรวจสอบข้อมูลทะเบียนรถและเจ้าของ</p>
              <Button onClick={() => handleNavigate('/motorcycle-search', 'search')} className={`w-full ${features['search']?.is_enabled || isSuperAdmin ? '' : 'text-slate-400 border-slate-200 bg-slate-50'}`} variant="outline">ค้นหาข้อมูลทะเบียน</Button>
            </CardContent>
          </Card>

          {/* 4. Score Management (Admin Only) */}
          {isAdminOrUpper && (
            <Card className="border-none shadow-md bg-white hover:shadow-xl transition-all hover:-translate-y-1 border-l-4 border-l-blue-500 relative">
              {features['score'] && !features['score'].is_enabled && !isSuperAdmin && <div className="absolute top-3 right-3 px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded">CLOSED</div>}
              <CardHeader><CardTitle className="flex items-center text-blue-600"><UserPlus className="h-5 w-5 mr-2 animate-pulse" /> จัดการคะแนน</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-500 mb-4 text-sm">บันทึกแต้มความประพฤติกรณีนักเรียนทำผิด</p>
                <Button onClick={() => handleNavigate('/score-management', 'score')} className={`w-full shadow-sm ${features['score']?.is_enabled || isSuperAdmin ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-200 text-slate-400 hover:bg-slate-200'}`}>เปิดเมนูคะแนน</Button>
              </CardContent>
            </Card>
          )}

          {/* 5. Dashboard (Admin Only) */}
          {isAdminOrUpper && (
            <Card className="border-none shadow-md bg-white hover:shadow-xl transition-all hover:-translate-y-1 border-l-4 border-l-orange-500">
              <CardHeader><CardTitle className="flex items-center text-orange-600"><TrendingUp className="h-5 w-5 mr-2" /> แดชบอร์ดสถิติ</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-500 mb-4 text-sm">ดูภาพรวมสถิติจราจร กราฟ และยอดลงทะเบียน</p>
                <Button onClick={() => navigate('/dashboard')} className="w-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-orange-600 shadow-sm">ดูรายงานสรุป</Button>
              </CardContent>
            </Card>
          )}

          {/* 6. Sticker Generator (Admin Only) */}
          {isAdminOrUpper && (
            <Card className="border-none shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Printer className="h-5 w-5 mr-2" /> พิมพ์สติ๊กเกอร์
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-100 mb-4 text-sm">สร้างสติ๊กเกอร์ติดรถพร้อม QR Code แบบกลุ่ม (Batch Print)</p>
                <Button onClick={() => navigate('/sticker-generator')} className="w-full bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-sm font-bold">
                  สร้างสติ๊กเกอร์
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 7. System Status */}
          <Card className="md:col-span-2 overflow-hidden border-none shadow-lg bg-white">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <CardTitle className="text-lg font-medium flex items-center">
                <span className="relative flex h-2 w-2 mr-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span></span>
                ข่าวสารและสถานะระบบ
              </CardTitle>
              <div className="flex items-center space-x-3">
                {isSuperAdmin && <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-8 text-[11px] border border-white/20 px-3" onClick={() => navigate('/admin')}><Edit3 className="h-3 w-3 mr-1" /> แก้ไขประกาศ</Button>}
                <span className="text-slate-400 text-[10px] font-mono bg-white/5 px-2 py-1 rounded border border-white/10">VER 2.3.0</span>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-inner"><p className="text-slate-700 leading-relaxed text-sm"><span className="font-bold text-blue-700">ประกาศล่าสุด:</span> {announcement}</p></div>
                  <div className="flex items-center text-[10px] text-slate-400 italic"><Zap className="h-3 w-3 mr-1 text-yellow-500" /> ซิงค์ข้อมูลล่าสุดเมื่อ: {lastUpdate || '-'}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center"><Server className="h-3 w-3 mr-1" /> Live Monitors</h4>
                  <div className="grid grid-cols-1 gap-2"><StatusItem icon={<Globe className="h-3 w-3 text-blue-500" />} label="Web Service" /><StatusItem icon={<Database className="h-3 w-3 text-emerald-500" />} label="Database" /><StatusItem icon={<Lock className="h-3 w-3 text-indigo-500" />} label="SSL Secure" /><StatusItem icon={<Server className="h-3 w-3 text-orange-500" />} label="Cloud Host" /></div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

const StatusItem = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]"><div className="flex items-center text-[11px] font-medium text-slate-600"><div className="mr-2">{icon}</div>{label}</div><div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]"></div></div>
);

export default Home;