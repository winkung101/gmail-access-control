
-- วิธีตั้งค่า Super Admin ด้วยตนเอง (รันใน SQL Editor)
-- แทนที่ 'your-email@example.com' ด้วยอีเมลของคุณ

-- 1. ตรวจสอบผู้ใช้ปัจจุบัน
SELECT id, email, full_name, role FROM public.profiles;

-- 2. ตั้งค่า Super Admin (แทนที่อีเมลด้วยอีเมลของคุณ)
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';

-- 3. ตรวจสอบการเปลี่ยนแปลง
SELECT id, email, full_name, role FROM public.profiles WHERE role = 'super_admin';
