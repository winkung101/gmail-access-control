// /workspaces/gmail-access-control/src/pages/Index.tsx
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Search, Database, ShieldCheck, FileText, BarChart, Users } from 'lucide-react'; // เพิ่มไอคอนใหม่ที่เกี่ยวข้อง

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-4xl mx-auto px-4 py-12"> {/* ปรับ max-w และเพิ่ม py */}
        {/* ส่วนของโลโก้โรงเรียน - ยังคงเป็น placeholder คุณต้องเปลี่ยน path เอง */}
        <div className="mb-8">
          <img
            src="https://img2.pic.in.th/pic/ASW.png" // <<<--- สำคัญ: เปลี่ยน path นี้เป็น path จริงของโลโก้โรงเรียนของคุณ
            alt="School Logo"
            className="mx-auto h-28 w-auto object-contain" // ปรับขนาดให้ใหญ่ขึ้นเล็กน้อย
          />
        </div>

        <h1 className="text-5xl font-extrabold mb-6 text-gray-900 leading-tight"> {/* ปรับ font-weight และ leading */}
          ระบบสืบค้นทะเบียนรถจักรยานยนต์ <br className="hidden sm:inline" />โรงเรียนอาจสามารถวิทยา
        </h1>
        <p className="text-xl text-gray-700 mb-10 max-w-3xl mx-auto"> {/* ปรับสีและ max-w */}
          แพลตฟอร์มที่ออกแบบมาเพื่ออำนวยความสะดวกในการค้นหา ตรวจสอบ และจัดการข้อมูล
          รถจักรยานยนต์อย่างมีประสิทธิภาพและปลอดภัย
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"> {/* เพิ่ม mb */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-blue-200"> {/* ปรับสี/เงา */}
            <CardHeader>
              <CardTitle className="flex flex-col items-center justify-center text-xl font-bold text-blue-700">
                <Search className="h-8 w-8 mb-2" /> ค้นหาทันใจ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-base">
                เข้าถึงข้อมูลทะเบียนรถได้อย่างรวดเร็วเพียงปลายนิ้วสัมผัส
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-green-200">
            <CardHeader>
              <CardTitle className="flex flex-col items-center justify-center text-xl font-bold text-green-700">
                <Database className="h-8 w-8 mb-2" /> ข้อมูลครบถ้วน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-base">
                บันทึกและจัดเก็บข้อมูลรถจักรยานยนต์อย่างเป็นระบบและปลอดภัย
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-purple-200">
            <CardHeader>
              <CardTitle className="flex flex-col items-center justify-center text-xl font-bold text-purple-700">
                <ShieldCheck className="h-8 w-8 mb-2" /> ระบบความปลอดภัย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-base">
                ปกป้องข้อมูลผู้ใช้ด้วยการยืนยันตัวตนหลายระดับและสิทธิ์การเข้าถึง
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6"> {/* เพิ่ม space-y */}
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg transform transition-transform duration-200 hover:scale-105"
          >
            เข้าสู่ระบบ / สมัครสมาชิก
          </Button>
          <p className="text-base text-gray-600">
            หากพบปัญหาโปรดติดต่อแอดมิน
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;