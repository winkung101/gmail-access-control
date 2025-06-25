// src/hooks/useAppSettings.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client'; // นำเข้า Supabase client
import { toast } from '@/components/ui/use-toast'; // นำเข้า toast

// ใช้ชื่อ setting_name ที่ตรงกับในฐานข้อมูล
const REGISTRATION_SETTING_NAME = 'registration_enabled';

type AppSettings = {
  registrationEnabled: boolean;
  setRegistrationEnabled: (enabled: boolean) => Promise<void>; // ทำให้เป็น Promise<void>
  loading: boolean;
  refreshSettings: () => Promise<void>; // ทำให้เป็น Promise<void>
};

export const useAppSettings = (): AppSettings => {
  const [registrationEnabled, setRegistrationEnabledState] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // ฟังก์ชันสำหรับดึงสถานะจาก Supabase
  const fetchSettingFromSupabase = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_settings') // ใช้ชื่อตารางที่คุณสร้าง (เช่น 'app_settings' หรือ 'settings')
      .select('setting_value')
      .eq('setting_name', REGISTRATION_SETTING_NAME)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = Row not found (เป็นกรณีปกติเมื่อยังไม่มี setting นี้)
      console.error("Error fetching registration setting from Supabase:", error);
      toast({ title: "ข้อผิดพลาด", description: `ไม่สามารถโหลดการตั้งค่า: ${error.message}`, variant: "destructive" });
      setRegistrationEnabledState(true); // ตั้งค่าเริ่มต้นเป็น true หากเกิดข้อผิดพลาดในการดึง
    } else if (data) {
      // Supabase จะคืนค่า jsonb เป็น JavaScript object/boolean ตรงๆ
      setRegistrationEnabledState(data.setting_value === true); // ตรวจสอบให้แน่ใจว่าเป็น boolean
    } else {
      // หากไม่พบการตั้งค่าใน DB, ให้ถือว่าเปิดใช้งาน และอาจจะสร้างค่าเริ่มต้นให้
      setRegistrationEnabledState(true);
      // Optional: ถ้าไม่พบค่าใน DB อาจจะแทรกค่าเริ่มต้นเข้าไป (เฉพาะ super_admin ควรทำได้)
      // await supabase.from('app_settings').insert({ setting_name: REGISTRATION_SETTING_NAME, setting_value: true });
    }
    setLoading(false);
  }, []);

  // โหลดค่าเมื่อ component mount ครั้งแรก
  useEffect(() => {
    fetchSettingFromSupabase();
  }, [fetchSettingFromSupabase]);

  // ฟังก์ชันสำหรับอัปเดตค่าใน Supabase
  const setRegistrationEnabled = useCallback(async (enabled: boolean) => {
    setRegistrationEnabledState(enabled); // อัปเดต UI ทันทีเพื่อความลื่นไหล
    setLoading(true); // ตั้งสถานะ loading ขณะกำลังบันทึก

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { setting_name: REGISTRATION_SETTING_NAME, setting_value: enabled },
        { onConflict: 'setting_name' } // อัปเดตถ้ามีอยู่แล้ว, สร้างใหม่ถ้ายังไม่มี
      );

    if (error) {
      console.error("Error saving registration setting to Supabase:", error);
      toast({ title: "ข้อผิดพลาด", description: `ไม่สามารถบันทึกการตั้งค่า: ${error.message}`, variant: "destructive" });
      setRegistrationEnabledState(!enabled); // ย้อนสถานะกลับหากบันทึกไม่สำเร็จ
    } else {
      toast({ title: "สำเร็จ", description: `การสมัครสมาชิกถูก ${enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} แล้ว.`, duration: 3000 });
    }
    setLoading(false);
  }, []);

  // ฟังก์ชัน refreshSettings เพื่อให้ component อื่นเรียกเพื่อ re-fetch ค่า
  const refreshSettings = useCallback(async () => {
    await fetchSettingFromSupabase();
  }, [fetchSettingFromSupabase]);

  return { registrationEnabled, setRegistrationEnabled, loading, refreshSettings };
};