import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, ArrowLeft, User, hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface MotorcycleRecord {
  id: string;
  license_plate: string;
  province: string;
  brand: string;
  model: string;
  profiles: {
    full_name: string;
    classroom: string;
  } | null;
}

const MotorcycleSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [records, setRecords] = useState<MotorcycleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // รายชื่อห้องเรียน (สามารถปรับเปลี่ยนหรือดึงจาก DB ได้)
  const rooms = [
    "ม.1/1", "ม.1/2", "ม.2/1", "ม.2/2", "ม.3/1", "ม.3/2",
    "ม.4/1", "ม.4/2", "ม.5/1", "ม.5/2", "ม.6/1", "ม.6/2"
  ];

  const handleSearch = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('motorcycles')
        .select(`
          id,
          license_plate,
          province,
          brand,
          model,
          profiles (
            full_name,
            classroom
          )
        `);

      // กรองตามคำค้นหา (เลขทะเบียน หรือ ชื่อ)
      if (searchTerm) {
        query = query.or(`license_plate.ilike.%${searchTerm}%,profiles.full_name.ilike.%${searchTerm}%`);
      }

      // กรองตามห้องเรียน
      if (selectedRoom !== 'all') {
        query = query.eq('profiles.classroom', selectedRoom);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data as any || []);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ให้ค้นหาอัตโนมัติเมื่อมีการเปลี่ยนห้องเรียน
  useEffect(() => {
    handleSearch();
  }, [selectedRoom]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-slate-600">
            <ArrowLeft className="h-4 w-4 mr-2" /> ย้อนกลับ
          </Button>
          <h1 className="text-lg font-bold text-slate-900">ระบบสืบค้นทะเบียน</h1>
          <div className="w-20"></div> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* Search & Filter Section */}
        <Card className="mb-8 border-none shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* ช่องค้นหา */}
              <div className="md:col-span-7 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาเลขทะเบียน หรือ ชื่อนักเรียน..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {/* เลือกห้องเรียน */}
              <div className="md:col-span-3 relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-slate-600 font-medium cursor-pointer"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="all">ทุกห้องเรียน</option>
                  {rooms.map((room) => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>

              {/* ปุ่มค้นหา */}
              <Button 
                onClick={handleSearch} 
                className="md:col-span-2 h-11 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
                disabled={loading}
              >
                {loading ? "กำลังค้นหา..." : "ค้นหาข้อมูล"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.length > 0 ? (
            records.map((record) => (
              <Card key={record.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">{record.province}</div>
                  <div className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500">{record.profiles?.classroom || 'ไม่ระบุห้อง'}</div>
                </div>
                <CardContent className="pt-4">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                      {record.license_plate}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">{record.brand} - {record.model}</div>
                  </div>
                  <div className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs text-slate-400">เจ้าของรถ</div>
                      <div className="text-sm font-bold text-slate-700 truncate">
                        {record.profiles?.full_name || 'ไม่พบข้อมูลชื่อ'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-slate-500 font-medium">ไม่พบข้อมูลทะเบียนที่ท่านต้องการ</h3>
              <p className="text-slate-400 text-sm">ลองค้นหาด้วยเลขทะเบียนอื่น หรือเปลี่ยนการกรองห้องเรียน</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotorcycleSearch;