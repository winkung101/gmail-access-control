
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
                <p><strong>ชื่อ:</strong> {profile?.full_name}</p>
                <p><strong>อีเมล:</strong> {user?.email}</p>
                <p><strong>บทบาท:</strong> {profile?.role === 'super_admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}</p>
                <p><strong>สถานะ:</strong> {profile?.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}</p>
              </div>
            </CardContent>
          </Card>

          {profile?.role === 'super_admin' && (
            <Card>
              <CardHeader>
                <CardTitle>เมนูผู้ดูแลระบบ</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/admin')}
                  className="w-full"
                >
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
