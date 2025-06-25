
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

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
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-5xl font-bold mb-6 text-gray-900">
          ยินดีต้อนรับสู่ระบบ
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          ระบบจัดการผู้ใช้งานพร้อมระบบรักษาความปลอดภัยขั้นสูง
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                🔐 ความปลอดภัย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                ระบบรักษาความปลอดภัยด้วย CAPTCHA และการยืนยันตัวตน
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                👥 จัดการผู้ใช้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                ระบบจัดการผู้ใช้ครบครันสำหรับผู้ดูแลระบบ
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            เข้าสู่ระบบ / สมัครสมาชิก
          </Button>
          <p className="text-sm text-gray-500">
            คลิกเพื่อเข้าสู่ระบบหรือสมัครสมาชิกใหม่
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
