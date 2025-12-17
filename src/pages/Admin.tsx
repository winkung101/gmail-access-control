import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Megaphone, Users, ImageIcon, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const [announcement, setAnnouncement] = useState('');
  // --- ส่วนที่เพิ่มใหม่ ---
  const [imageUrl, setImageUrl] = useState('');
  const [version, setVersion] = useState(1);
  // --------------------
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const ANNOUNCE_ID = '00000000-0000-0000-0000-000000000000';

  // ดึงข้อมูลประกาศปัจจุบัน
  useEffect(() => {
    const fetchAnnounce = async () => {
      const { data } = await supabase.from('announcements').select('*').eq('id', ANNOUNCE_ID).maybeSingle();
      if (data) {
        setAnnouncement(data.content || '');
        // --- ส่วนที่เพิ่มใหม่ ---
        setImageUrl(data.image_url || '');
        setVersion(data.version || 1);
        // --------------------
      }
    };
    fetchAnnounce();
  }, []);

  const handleUpdateAnnounce = async (upgradeVersion: boolean = false) => {
    setLoading(true);
    
    // ถ้ากดปุ่ม "อัปเดตเพื่อเด้งป๊อปอัป" ให้บวกเวอร์ชันเพิ่ม 1
    const newVersion = upgradeVersion ? version + 1 : version;

    const { error } = await supabase
      .from('announcements')
      .upsert({ 
        id: ANNOUNCE_ID, 
        content: announcement, 
        image_url: imageUrl, // บันทึกรูปภาพเพิ่ม
        version: newVersion,  // บันทึกเวอร์ชันเพิ่ม
        updated_at: new Date() 
      });

    if (error) {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      setVersion(newVersion);
      toast({ 
        title: "สำเร็จ", 
        description: upgradeVersion ? "อัปเดตและส่งแจ้งเตือน Pop-up ใหม่แล้ว" : "อัปเดตประกาศเรียบร้อยแล้ว" 
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/home')}><ArrowLeft className="mr-2 h-4 w-4"/> กลับหน้าหลัก</Button>
        
        <h1 className="text-3xl font-bold text-slate-900">แผงควบคุม Super Admin</h1>

        {/* ส่วนจัดการประกาศ (เพิ่มระบบ Pop-up เข้าไป) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Megaphone className="mr-2 h-5 w-5 text-blue-500"/> แก้ไขประกาศและระบบ Pop-up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500">ข้อความประกาศ</label>
              <textarea 
                className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="พิมพ์ข้อความประกาศที่นี่..."
              />
            </div>

            {/* --- ส่วนที่เพิ่มใหม่: ช่องใส่ URL รูปภาพ --- */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500 flex items-center">
                <ImageIcon className="mr-2 h-4 w-4" /> ลิงก์รูปภาพสำหรับ Pop-up (ใส่หรือไม่ใส่ก็ได้)
              </label>
              <Input 
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              {imageUrl && (
                <div className="mt-2 text-center border p-2 rounded bg-slate-100">
                  <p className="text-[10px] text-slate-400 mb-1 uppercase font-bold">ตัวอย่างรูปภาพ</p>
                  <img src={imageUrl} alt="Preview" className="max-h-32 mx-auto rounded shadow-sm" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* ปุ่มบันทึกแบบเดิม */}
              <Button onClick={() => handleUpdateAnnounce(false)} disabled={loading} variant="outline">
                <Save className="mr-2 h-4 w-4"/> {loading ? 'กำลังบันทึก...' : 'บันทึก (ไม่เด้งใหม่)'}
              </Button>

              {/* ปุ่มใหม่: อัปเดตเพื่อให้ป๊อปอัปเด้งหาทุกคนใหม่ */}
              <Button onClick={() => handleUpdateAnnounce(true)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                <RefreshCw className="mr-2 h-4 w-4"/> {loading ? 'กำลังดำเนินการ...' : 'อัปเดตและเด้ง Pop-up ใหม่'}
              </Button>
            </div>
            
            <p className="text-[10px] text-slate-400 italic text-center">
              *เวอร์ชันปัจจุบัน: {version} (หากกด "อัปเดตและเด้ง Pop-up ใหม่" เลขเวอร์ชันจะเพิ่มขึ้นและ Pop-up จะแสดงให้ทุกคนเห็นอีกครั้ง)
            </p>
          </CardContent>
        </Card>

        {/* ส่วนจัดการ User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-indigo-500"/> การจัดการผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">จัดการ User ผ่าน Dashboard ของ Supabase เพื่อความปลอดภัยสูงสุด</p>
            <Button variant="outline" className="w-full" onClick={() => window.open('https://supabase.com/dashboard/project/_/auth/users', '_blank')}>
              ไปที่หน้าจัดการ User (Supabase)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;