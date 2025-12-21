import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bike, Users, Calendar, TrendingUp, PieChart as PieIcon, Loader2, BarChart2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff6b6b'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalBikes, setTotalBikes] = useState(0);
  const [todayNew, setTodayNew] = useState(0);
  const [classData, setClassData] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any[]>([]); // Data สำหรับรายห้อง
  const [brandData, setBrandData] = useState<any[]>([]);

  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';

  // 1. ดึงข้อมูล Google Sheets
  const fetchGoogleSheetData = useCallback(async () => {
    if (!GOOGLE_SHEET_ID) return [];
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      
      const text = await response.text();
      const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      
      if (!jsonString || !jsonString[1]) return [];
      
      const json = JSON.parse(jsonString[1]);
      const cols = json.table.cols;
      const rows = json.table.rows;

      if (!rows || rows.length === 0) return [];

      const colMap: { [key: string]: number } = {};
      cols.forEach((col: any, index: number) => {
        if (col && col.label) colMap[col.label.trim()] = index;
      });

      const getColIndex = (names: string[]) => {
        for (const name of names) {
          if (colMap[name] !== undefined) return colMap[name];
        }
        return -1;
      };

      const idxTime = getColIndex(['ประทับเวลา', 'Timestamp']);
      const idxClass = getColIndex(['ชั้น (Ex. 1/1)', 'ชั้น']);
      const idxBrand = getColIndex(['ยี้ห้อ', 'ยี่ห้อ']);

      return rows.map((row: any) => {
        const getVal = (idx: number) => (idx !== -1 && row.c[idx]) ? (row.c[idx].v || row.c[idx].f || '') : '';
        return {
          source: 'google',
          created_at: getVal(idxTime),
          classroom: getVal(idxClass),
          brand_model: getVal(idxBrand)
        };
      }).filter((item: any) => item.brand_model);

    } catch (error) {
      console.error("Google Sheet Error:", error);
      return [];
    }
  }, []);

  // 2. ดึงข้อมูล Supabase
  const fetchSupabaseData = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('motorcycles').select('created_at, classroom, brand_model');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Supabase Error:", error);
      return [];
    }
  }, []);

  // 3. รวมข้อมูลและคำนวณ
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      const [googleData, supabaseData] = await Promise.all([
        fetchGoogleSheetData(),
        fetchSupabaseData()
      ]);

      const allData = [...supabaseData, ...googleData];
      
      console.log(`Stats Loaded: Total=${allData.length}`);

      if (allData.length > 0) {
        // A. ยอดรวม
        setTotalBikes(allData.length);

        // B. ยอดวันนี้
        const todayStr = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        allData.forEach(item => {
          let itemDateStr = '';
          if (item.created_at) {
            try {
               const d = new Date(item.created_at);
               if (!isNaN(d.getTime())) itemDateStr = d.toISOString().split('T')[0];
            } catch (e) {}
          }
          if (itemDateStr === todayStr) todayCount++;
        });
        setTodayNew(todayCount);

        // --- C. คำนวณกราฟ (แยกห้อง vs เลือกระดับชั้น) ---
        const classCount: Record<string, number> = {}; // นับระดับชั้น (ม.1, ม.2)
        const roomCount: Record<string, number> = {};  // นับรายห้อง (ม.1/1, ม.1/2)

        allData.forEach(item => {
          if (item.classroom) {
            let rawClass = item.classroom.toString().trim();

            // 1. Normalize: แก้ไขรูปแบบให้เป็นมาตรฐาน (เช่น "1/1" -> "ม.1/1")
            if (/^[0-9]/.test(rawClass)) {
              rawClass = `ม.${rawClass}`;
            }
            // แก้ไขพวกเว้นวรรคผิด หรือไม่มีจุด (เช่น "ม 1/1" -> "ม.1/1")
            rawClass = rawClass.replace('ม ', 'ม.'); 

            // 2. นับยอดรายห้อง (เฉพาะที่มี / หรือเป็นครู)
            if (rawClass.includes('/') || rawClass.includes('ครู')) {
                // จัดการกลุ่มครูให้รวมกัน
                if (rawClass.includes('ครู') || rawClass.includes('บุคลากร')) {
                    rawClass = 'ครู/บุคลากร';
                }
                roomCount[rawClass] = (roomCount[rawClass] || 0) + 1;
            }

            // 3. นับยอดระดับชั้น (ตัด / ออก)
            let mainClass = rawClass.split('/')[0].trim();
            if (mainClass === 'ครู' || mainClass.includes('บุคลากร')) mainClass = 'ครู/บุคลากร';

            if (mainClass.startsWith('ม.') || mainClass === 'ครู/บุคลากร') {
               classCount[mainClass] = (classCount[mainClass] || 0) + 1;
            }
          }
        });

        // Prepare Class Data (Bar Chart)
        const processedClassData = Object.keys(classCount).map(key => ({
          name: key,
          count: classCount[key]
        })).sort((a, b) => {
            const order = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ครู/บุคลากร'];
            return order.indexOf(a.name) - order.indexOf(b.name);
        });
        setClassData(processedClassData);

        // Prepare Room Data (Horizontal Bar Chart - TOP 10)
        const processedRoomData = Object.keys(roomCount)
            .map(key => ({ name: key, count: roomCount[key] }))
            .sort((a, b) => b.count - a.count) // เรียงจากมากไปน้อย
            .slice(0, 10); // เอาแค่ 10 อันดับแรก
        setRoomData(processedRoomData);

        // D. กราฟวงกลม (ยี่ห้อ)
        const brandCount: Record<string, number> = {};
        allData.forEach(item => {
          if (item.brand_model) {
            let brand = item.brand_model.toString().split(' ')[0].trim(); 
            if (brand.toLowerCase().includes('honda')) brand = 'Honda';
            if (brand.toLowerCase().includes('yamaha')) brand = 'Yamaha';
            if (brand.toLowerCase().includes('vespa')) brand = 'Vespa';
            if (brand.toLowerCase().includes('gpx')) brand = 'GPX';
            
            if (brand) brandCount[brand] = (brandCount[brand] || 0) + 1;
          }
        });
        const sortedBrands = Object.keys(brandCount).sort((a, b) => brandCount[b] - brandCount[a]);
        const topBrands = sortedBrands.slice(0, 5).map(key => ({ name: key, value: brandCount[key] }));
        const otherCount = sortedBrands.slice(5).reduce((sum, key) => sum + brandCount[key], 0);
        if (otherCount > 0) topBrands.push({ name: 'อื่นๆ', value: otherCount });
        setBrandData(topBrands);
      }
      
      setLoading(false);
    };

    initData();
  }, [fetchGoogleSheetData, fetchSupabaseData]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/home')} className="-ml-2">
              <ArrowLeft className="h-5 w-5 mr-1" /> หน้าหลัก
            </Button>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
              <TrendingUp className="mr-2 text-blue-600" /> แดชบอร์ดสถิติ
            </h1>
          </div>
          <div className="text-sm text-slate-500 text-right hidden sm:block">
            ข้อมูลล่าสุด: {new Date().toLocaleTimeString('th-TH')}
          </div>
        </div>

        {/* --- KPI Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-md bg-white border-l-4 border-l-blue-500">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">รถลงทะเบียนทั้งหมด</p>
                <h2 className="text-3xl font-bold text-slate-800">{loading ? <Loader2 className="animate-spin h-6 w-6"/> : totalBikes} <span className="text-sm font-normal text-slate-400">คัน</span></h2>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Bike className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white border-l-4 border-l-green-500">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">ลงทะเบียนใหม่วันนี้</p>
                <h2 className="text-3xl font-bold text-green-600">{loading ? "..." : `+${todayNew}`} <span className="text-sm font-normal text-slate-400">คัน</span></h2>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Calendar className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white border-l-4 border-l-purple-500">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">ห้องที่นำรถมามากที่สุด</p>
                <h2 className="text-xl font-bold text-purple-600 truncate max-w-[150px]">
                  {loading ? "..." : (roomData[0]?.name || "-")}
                </h2>
                <p className="text-xs text-slate-400">{roomData[0]?.count || 0} คัน</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- Charts Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: แยกตามระดับชั้น */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-slate-700">ภาพรวมแยกตามระดับชั้น</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300 h-8 w-8"/></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                      <LabelList dataKey="count" position="top" style={{ fill: '#64748b', fontSize: 10 }} />
                      {classData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Top 10 ห้องเรียน (NEW!) */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-slate-700 flex items-center">
                <BarChart2 className="mr-2 h-4 w-4 text-orange-500" /> 10 อันดับห้องที่มีรถมากที่สุด
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300 h-8 w-8"/></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={roomData} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 12, fontWeight: 500}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                    <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="count" position="right" style={{ fill: '#64748b', fontSize: 11 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 3: สัดส่วนยี่ห้อรถ (ย้ายมาล่างสุด) */}
          <Card className="border-none shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg text-slate-700 flex items-center">
                <PieIcon className="mr-2 h-4 w-4" /> สัดส่วนยี่ห้อรถ
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300 h-8 w-8"/></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={brandData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {brandData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;