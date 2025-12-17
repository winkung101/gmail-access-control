import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Megaphone, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const [announcement, setAnnouncement] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // ดึงข้อมูลประกาศปัจจุบัน
  useEffect(() => {
    const fetchAnnounce = async () => {
      const { data } = await supabase.from('announcements').select('*').limit(1).maybeSingle();
      if (data) setAnnouncement(data.content);
    };
    fetchAnnounce();
  }, []);

  const handleUpdateAnnounce = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('announcements')
      .upsert({ id: '00000000-0000-0000-0000-000000000000', content: announcement, updated_at: new Date() });

    if (error) {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "สำเร็จ", description: "อัปเดตประกาศเรียบร้อยแล้ว" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/home')}><ArrowLeft className="mr-2 h-4 w-4"/> กลับหน้าหลัก</Button>
        
        <h1 className="text-3xl font-bold text-slate-900">แผงควบคุม Super Admin</h1>

        {/* ส่วนจัดการประกาศ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Megaphone className="mr-2 h-5 w-5 text-blue-500"/> แก้ไขประกาศหน้าหลัก</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea 
              className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="พิมพ์ข้อความประกาศที่นี่..."
            />
            <Button onClick={handleUpdateAnnounce} disabled={loading} className="w-full bg-blue-600">
              <Save className="mr-2 h-4 w-4"/> {loading ? 'กำลังบันทึก...' : 'บันทึกประกาศ'}
            </Button>
          </CardContent>
        </Card>

        {/* ส่วนจัดการ User (Link ไปหน้า Supabase หรือสร้างตารางจัดการ) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-indigo-500"/> การจัดการผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">ขณะนี้คุณสามารถจัดการ User ได้โดยตรงผ่านหน้า Dashboard ของ Supabase เพื่อความปลอดภัยสูงสุด</p>
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