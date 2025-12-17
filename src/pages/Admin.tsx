import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea'; // ใช้ Textarea ของ UI
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Megaphone, Users, ImageIcon, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const [announcement, setAnnouncement] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [version, setVersion] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const ANNOUNCE_ID = '00000000-0000-0000-0000-000000000000';

  useEffect(() => {
    const fetchAnnounce = async () => {
      const { data } = await supabase.from('announcements').select('*').eq('id', ANNOUNCE_ID).maybeSingle();
      if (data) {
        setAnnouncement(data.content || '');
        setImageUrl(data.image_url || '');
        setVersion(data.version || 1);
      }
    };
    fetchAnnounce();
  }, []);

  const handleUpdateAnnounce = async (upgradeVersion: boolean = false) => {
    setLoading(true);
    const newVersion = upgradeVersion ? version + 1 : version;

    const { error } = await supabase
      .from('announcements')
      .upsert({ 
        id: ANNOUNCE_ID, 
        content: announcement, 
        image_url: imageUrl, 
        version: newVersion, 
        updated_at: new Date() 
      });

    if (error) {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      setVersion(newVersion);
      toast({ 
        title: "สำเร็จ", 
        description: upgradeVersion ? "อัปเดตและรีเซ็ตสถานะการมองเห็นให้ทุกคนแล้ว" : "อัปเดตประกาศเรียบร้อยแล้ว" 
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/home')} className="hover:bg-white">
          <ArrowLeft className="mr-2 h-4 w-4"/> กลับหน้าหลัก
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">แผงควบคุมระบบประกาศ</h1>
          <div className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
            <p className="text-blue-700 text-sm font-medium">เวอร์ชันปัจจุบัน: <span className="font-bold">{version}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ส่วนจัดการข้อมูล (Left) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-50">
                <CardTitle className="flex items-center text-slate-700">
                  <Megaphone className="mr-2 h-5 w-5 text-blue-500"/> ตั้งค่าเนื้อหา Pop-up
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">ข้อความประกาศ</label>
                  <Textarea 
                    className="min-h-[150px] bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="พิมพ์รายละเอียดที่ต้องการแจ้งให้นักเรียนทราบ..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 flex items-center">
                    <ImageIcon className="mr-2 h-4 w-4 text-slate-400" /> ลิงก์รูปภาพ (ขนาดที่แนะนำ 1080 x 1080)
                  </label>
                  <Input 
                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={() => handleUpdateAnnounce(false)} 
                    disabled={loading} 
                    variant="outline" 
                    className="flex-1 h-12 border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <Save className="mr-2 h-4 w-4"/> {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </Button>
                  <Button 
                    onClick={() => handleUpdateAnnounce(true)} 
                    disabled={loading} 
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 shadow-blue-100 shadow-lg transition-all"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading && 'animate-spin'}`}/> 
                    บันทึกและให้เด้งใหม่สำหรับทุกคน
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-slate-900 text-white">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center"><Users className="mr-2 h-5 w-5 text-blue-400"/> จัดการผู้ใช้งาน</h3>
                  <p className="text-slate-400 text-xs mt-1">จัดการสิทธิ์และบัญชีรายชื่อผ่าน Supabase Dashboard</p>
                </div>
                <Button variant="outline" className="text-white border-slate-700 hover:bg-slate-800" onClick={() => window.open('https://supabase.com/dashboard/project/_/auth/users', '_blank')}>
                  เปิดหน้าจัดการ
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ส่วน Preview (Right) */}
          <div className="lg:col-span-5">
            <Card className="border-none shadow-sm sticky top-8 overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-500 flex items-center uppercase tracking-wider">
                  <Eye className="mr-2 h-4 w-4" /> ตัวอย่างบนหน้าจอผู้ใช้
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-slate-100/50">
                {/* จำลอง Pop-up Container */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-[320px] mx-auto border border-slate-200">
                  {/* ขนาดจัตุรัส 1:1 */}
                  <div className="aspect-square w-full bg-slate-200 relative overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                        <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-[10px]">รองรับรูปภาพ 1080x1080<br/>(จะถูกปรับให้พอดีโดยอัตโนมัติ)</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="h-2 w-1/2 bg-blue-100 rounded-full mb-4"></div>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                      {announcement || 'ข้อความประกาศจะแสดงตรงนี้...'}
                    </p>
                    <div className="pt-2 space-y-2">
                      <Button disabled className="w-full h-8 text-[10px] bg-slate-900 rounded-lg">รับทราบ</Button>
                      <Button disabled variant="ghost" className="w-full h-8 text-[9px] text-slate-400">ไม่ต้องแสดงอีก</Button>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-4 italic">* ตัวอย่างการแสดงผลบนสมาร์ทโฟน</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;