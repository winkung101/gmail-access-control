
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export const SuperAdminSetup = () => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSetSuperAdmin = async () => {
    if (!user?.email) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่พบข้อมูลผู้ใช้",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // เรียกใช้ function โดยตรงผ่าน SQL
      const { error } = await supabase.rpc('set_first_super_admin' as any, {
        user_email: user.email
      });

      if (error) throw error;

      toast({
        title: "สำเร็จ",
        description: "ตั้งค่า Super Admin เรียบร้อยแล้ว",
      });
      
      // รีเฟรช profile เพื่ออัปเดต role
      await refreshProfile();
      
    } catch (error: any) {
      console.error('Error setting super admin:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: error.message || "ไม่สามารถตั้งค่า Super Admin ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>ตั้งค่า Super Admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          คุณสามารถตั้งค่าตัวเองเป็น Super Admin คนแรกของระบบได้
        </p>
        <div>
          <label className="text-sm font-medium">อีเมลปัจจุบัน:</label>
          <Input value={user?.email || ''} disabled />
        </div>
        <Button 
          onClick={handleSetSuperAdmin} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'กำลังตั้งค่า...' : 'ตั้งค่าเป็น Super Admin'}
        </Button>
      </CardContent>
    </Card>
  );
};
