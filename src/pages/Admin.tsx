import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Megaphone, Users, ImageIcon, RefreshCw, Eye, Settings, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch'; // ต้องมั่นใจว่ามี Component นี้ (ถ้าไม่มีใช้ Checkbox แทนได้)

interface FeatureFlag {
  feature_key: string;
  label: string;
  is_enabled: boolean;
  message: string;
}

const Admin = () => {
  // ... State เดิม ...
  const [announcement, setAnnouncement] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [version, setVersion] = useState(1);
  
  // --- State ใหม่สำหรับ Feature Flags ---
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const ANNOUNCE_ID = '00000000-0000-0000-0000-000000000000';

  useEffect(() => {
    // โหลดข้อมูลประกาศเดิม
    const fetchAnnounce = async () => {
      const { data } = await supabase.from('announcements').select('*').eq('id', ANNOUNCE_ID).maybeSingle();
      if (data) {
        setAnnouncement(data.content || '');
        setImageUrl(data.image_url || '');
        setVersion(data.version || 1);
      }
    };

    // --- โหลดข้อมูลสถานะฟีเจอร์ ---
    const fetchFeatures = async () => {
      const { data } = await supabase.from('feature_flags').select('*').order('feature_key');
      if (data) setFeatures(data);
    };

    fetchAnnounce();
    fetchFeatures();
  }, []);

  // ฟังก์ชันอัปเดตประกาศ (เดิม)
  const handleUpdateAnnounce = async (upgradeVersion: boolean = false) => {
    setLoading(true);
    const newVersion = upgradeVersion ? version + 1 : version;
    const { error } = await supabase.from('announcements').upsert({ 
      id: ANNOUNCE_ID, content: announcement, image_url: imageUrl, version: newVersion, updated_at: new Date() 
    });
    if (error) toast({ title: "ผิดพลาด", variant: "destructive" });
    else {
      setVersion(newVersion);
      toast({ title: "สำเร็จ", description: upgradeVersion ? "ส่งแจ้งเตือนใหม่แล้ว" : "บันทึกเรียบร้อย" });
    }
    setLoading(false);
  };

  // --- ฟังก์ชันอัปเดตฟีเจอร์ (ใหม่) ---
  const handleToggleFeature = async (key: string, currentValue: boolean) => {
    // อัปเดต UI ทันทีเพื่อให้รู้ว่ากดแล้ว
    setFeatures(features.map(f => f.feature_key === key ? { ...f, is_enabled: !currentValue } : f));
    
    const { error } = await supabase.from('feature_flags').update({ is_enabled: !currentValue }).eq('feature_key', key);
    if (error) toast({ title: "ตั้งค่าไม่สำเร็จ", variant: "destructive" });
  };

  const handleUpdateMessage = async (key: string, newMessage: string) => {
    const { error } = await supabase.from('feature_flags').update({ message: newMessage }).eq('feature_key', key);
    if (error) toast({ title: "บันทึกข้อความไม่สำเร็จ", variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/home')}><ArrowLeft className="mr-2 h-4 w-4"/> กลับหน้าหลัก</Button>
        <h1 className="text-3xl font-bold text-slate-900">แผงควบคุม Super Admin</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ส่วนจัดการประกาศ (Left - 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-white border-b"><CardTitle className="flex items-center text-slate-700"><Megaphone className="mr-2 h-5 w-5 text-blue-500"/> จัดการประกาศ Pop-up</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* ... (โค้ด Input ประกาศเดิม) ... */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">ข้อความ</label>
                  <Textarea className="bg-slate-50" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">รูปภาพ URL</label>
                  <Input className="bg-slate-50" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => handleUpdateAnnounce(false)} disabled={loading} variant="outline" className="flex-1"><Save className="mr-2 h-4 w-4"/> บันทึก</Button>
                  <Button onClick={() => handleUpdateAnnounce(true)} disabled={loading} className="flex-1 bg-blue-600"><RefreshCw className="mr-2 h-4 w-4"/> บันทึกและแจ้งเตือน</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ส่วนตั้งค่าระบบ เปิด/ปิด (Right - 5 cols) - ส่วนที่เพิ่มใหม่ */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-md">
                  <Settings className="mr-2 h-5 w-5" /> เปิด/ปิด ฟังก์ชันระบบ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {features.map((feature) => (
                    <div key={feature.feature_key} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Power className={`h-4 w-4 ${feature.is_enabled ? 'text-green-500' : 'text-red-500'}`} />
                          <span className="font-bold text-slate-700">{feature.label}</span>
                        </div>
                        {/* Switch Toggle */}
                        <div 
                          className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${feature.is_enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                          onClick={() => handleToggleFeature(feature.feature_key, feature.is_enabled)}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${feature.is_enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                      </div>
                      
                      {!feature.is_enabled && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] text-slate-400 uppercase font-bold">ข้อความแจ้งเตือนเมื่อปิดระบบ</label>
                          <div className="flex gap-2 mt-1">
                            <Input 
                              className="h-8 text-xs bg-red-50 border-red-100 text-red-800" 
                              value={feature.message} 
                              onChange={(e) => {
                                const newFeatures = features.map(f => f.feature_key === feature.feature_key ? { ...f, message: e.target.value } : f);
                                setFeatures(newFeatures);
                              }}
                            />
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-400" onClick={() => handleUpdateMessage(feature.feature_key, feature.message)}>
                              <Save className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* จัดการ User Link */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <Button variant="outline" className="w-full" onClick={() => window.open('https://supabase.com/dashboard/project/_/auth/users', '_blank')}>
                  <Users className="mr-2 h-4 w-4"/> จัดการ User ใน Supabase
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Admin;