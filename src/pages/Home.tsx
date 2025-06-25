// src/pages/Home.tsx
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperAdminSetup } from '@/components/SuperAdminSetup';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Settings } from 'lucide-react';

const Home = () => {
  const { user, profile, signOut, loading: authLoading, superAdminExists } = useAuth(); // ดึง superAdminExists
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // แสดง SuperAdminSetup ถ้ายังไม่มี super admin role
  // และยังไม่มี super admin คนอื่นในระบบ (ตรวจสอบจาก superAdminExists)
  const showSuperAdminSetup = profile && profile.role !== 'super_admin' && !superAdminExists;

  // เพิ่ม loading state สำหรับ auth เพื่อป้องกันการแสดงผลผิดพลาดชั่วคราว
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

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
                <p><strong>บทบาท:</strong> {profile?.role === 'super_admin' ? 'ผู้ดูแลระบบ' : profile?.role === 'ฝ่ายปกครอง' ? 'ฝ่ายปกครอง' : 'ผู้ใช้ทั่วไป'}</p>
                <p><strong>สถานะ:</strong> {profile?.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                ลงทะเบียนรถจักรยานยนต์
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                ลงทะเบียนรถจักรยานยนต์ใหม่ผ่านแบบฟอร์มออนไลน์
              </p>
              <Button 
                onClick={() => navigate('/motorcycle-registration')}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                ลงทะเบียนรถจักรยานยนต์
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                ระบบสืบค้นทะเบียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                ค้นหาข้อมูลทะเบียนรถจักรยานยนต์ในระบบ
              </p>
              <Button 
                onClick={() => navigate('/motorcycle-search')}
                className="w-full"
                variant="outline"
              >
                <Search className="h-4 w-4 mr-2" />
                ค้นหาทะเบียน
              </Button>
            </CardContent>
          </Card>

          {profile?.role === 'super_admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  เมนูผู้ดูแลระบบ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/admin')}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  จัดการผู้ใช้
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ซ่อน SuperAdminSetup ถ้ามี super admin อยู่แล้ว */}
          {showSuperAdminSetup && (
            <SuperAdminSetup />
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