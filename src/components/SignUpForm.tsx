// src/components/SignUpForm.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleCaptcha } from './SimpleCaptcha';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react'; // แก้ไข: เพิ่ม Loader2 ที่นี่

export const SignUpForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  
  const { registrationEnabled, loading: settingsLoading } = useAppSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (settingsLoading) {
        toast({
            title: "กำลังโหลดสถานะ",
            description: "ระบบกำลังตรวจสอบสถานะการสมัครสมาชิก...",
            variant: "default",
        });
        return;
    }

    if (!registrationEnabled) {
      toast({
        title: "การสมัครสมาชิกถูกปิดใช้งาน",
        description: "ขณะนี้ไม่สามารถสมัครสมาชิกใหม่ได้ กรุณาติดต่อผู้ดูแลระบบ",
        variant: "destructive",
      });
      return;
    }
    
    if (!captchaVerified) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณายืนยัน Captcha ก่อน",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "ข้อผิดพลาด",
        description: "รหัสผ่านไม่ตรงกัน",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      toast({
        title: "สมัครสมาชิกไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "สมัครสมาชิกสำเร็จ",
        description: "กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
      });
      // Reset form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setCaptchaVerified(false);
    }
    setLoading(false);
  };

  const isFormDisabled = loading || settingsLoading || !registrationEnabled;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">สมัครสมาชิก</CardTitle>
      </CardHeader>
      <CardContent>
        {settingsLoading ? (
            <Alert className="mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>กำลังโหลดสถานะ</AlertTitle>
                <AlertDescription>กำลังตรวจสอบสถานะการสมัครสมาชิก...</AlertDescription>
            </Alert>
        ) : !registrationEnabled && (
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>ปิดการสมัครสมาชิก</AlertTitle>
                <AlertDescription>ขณะนี้ระบบปิดการสมัครสมาชิกใหม่ชั่วคราว กรุณาติดต่อผู้ดูแลระบบ</AlertDescription>
            </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="กรอกชื่อ-นามสกุล"
              disabled={isFormDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="กรอกอีเมลของคุณ"
              disabled={isFormDisabled}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="กรอกรหัสผ่าน"
              disabled={isFormDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="ยืนยันรหัสผ่าน"
              disabled={isFormDisabled}
            />
          </div>

          <SimpleCaptcha onVerify={setCaptchaVerified} disabled={isFormDisabled} />

          <Button
            type="submit"
            className="w-full"
            disabled={isFormDisabled || !captchaVerified}
          >
            {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};