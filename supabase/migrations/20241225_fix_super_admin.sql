
-- แก้ไข RLS policies เพื่อให้ super admin สามารถจัดการผู้ใช้ได้
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;

-- สร้าง policy ใหม่ที่ไม่มีการเรียกซ้ำ
CREATE POLICY "Super admin can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (
    (auth.uid() = id) OR 
    (public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Super admin can update all profiles" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    (auth.uid() = id) OR 
    (public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Super admin can delete profiles" 
  ON public.profiles 
  FOR DELETE 
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can insert profiles" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- สร้าง function เพื่อตั้งค่า super admin แรก
CREATE OR REPLACE FUNCTION public.set_first_super_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ตรวจสอบว่ายังไม่มี super admin อยู่
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'super_admin') THEN
    -- อัปเดต user ที่มี email ตรงกับที่ระบุให้เป็น super admin
    UPDATE public.profiles 
    SET role = 'super_admin' 
    WHERE email = user_email;
    
    -- แจ้งผลลัพธ์
    IF FOUND THEN
      RAISE NOTICE 'User % has been set as super admin', user_email;
    ELSE
      RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
  ELSE
    RAISE EXCEPTION 'Super admin already exists';
  END IF;
END;
$$;

-- สร้าง function สำหรับ admin ที่มีอยู่แล้วเปลี่ยน role ได้
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(user_email text, current_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ตรวจสอบว่า current_admin_id เป็น super admin
  IF public.has_role(current_admin_id, 'super_admin') THEN
    UPDATE public.profiles 
    SET role = 'super_admin' 
    WHERE email = user_email;
    
    IF FOUND THEN
      RAISE NOTICE 'User % has been promoted to super admin', user_email;
    ELSE
      RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
  ELSE
    RAISE EXCEPTION 'Only super admin can promote users';
  END IF;
END;
$$;
