// src/pages/Admin.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit, ArrowLeft, Settings2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAppSettings } from '@/hooks/useAppSettings';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

const Admin = () => {
  const { signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { registrationEnabled, setRegistrationEnabled, loading: settingsLoading } = useAppSettings();

  useEffect(() => {
    if (!hasRole('super_admin')) {
      navigate('/home');
    }
  }, [hasRole, navigate]);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: (allRoles || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role)
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', userId);
        
        if (error) throw error;
        
        toast({
          title: "สำเร็จ",
          description: "ลบผู้ใช้เรียบร้อยแล้ว",
        });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "ข้อผิดพลาด",
          description: "ไม่สามารถลบผู้ใช้ได้",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editingUser.full_name,
        })
        .eq('user_id', editingUser.user_id);
      
      if (profileError) throw profileError;

      // Update role - first delete existing roles, then insert new one
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUser.user_id);

      if (editingUser.roles.length > 0) {
        const { error: roleError } = await (supabase as any)
          .from('user_roles')
          .insert({
            user_id: editingUser.user_id,
            role: editingUser.roles[0]
          });
        
        if (roleError) throw roleError;
      }
      
      toast({
        title: "สำเร็จ",
        description: "อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว",
      });
      
      setDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleRegistrationToggle = (checked: boolean) => {
    setRegistrationEnabled(checked);
  };

  const getRoleDisplay = (roles: string[]) => {
    if (roles.includes('super_admin')) return 'ผู้ดูแลระบบ';
    if (roles.includes('admin')) return 'แอดมิน';
    return 'ผู้ใช้ทั่วไป';
  };

  const getRoleColor = (roles: string[]) => {
    if (roles.includes('super_admin')) return 'bg-red-100 text-red-800';
    if (roles.includes('admin')) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading || settingsLoading) {
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/home')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับหน้าหลัก
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">จัดการผู้ใช้</h1>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            ออกจากระบบ
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings2 className="h-5 w-5 mr-2" />
              ตั้งค่าระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="registration-toggle" className="flex flex-col space-y-1">
                <span>เปิด/ปิด การสมัครสมาชิกใหม่</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  ผู้ใช้ใหม่สามารถสมัครสมาชิกได้หรือไม่
                </span>
              </Label>
              <Switch
                id="registration-toggle"
                checked={registrationEnabled}
                onCheckedChange={handleRegistrationToggle}
                disabled={settingsLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>รายชื่อผู้ใช้ทั้งหมด</span>
              <span className="text-sm font-normal text-gray-500">
                จำนวน: {users.length} คน
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead>วันที่สมัคร</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(user.roles)}`}>
                          {getRoleDisplay(user.roles)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('th-TH')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
                              </DialogHeader>
                              {editingUser && (
                                <form onSubmit={handleUpdateUser} className="space-y-4">
                                  <div>
                                    <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                                    <Input
                                      id="fullName"
                                      value={editingUser.full_name || ''}
                                      onChange={(e) => setEditingUser({
                                        ...editingUser,
                                        full_name: e.target.value
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="role">บทบาท</Label>
                                    <select
                                      id="role"
                                      value={editingUser.roles[0] || 'user'}
                                      onChange={(e) => setEditingUser({
                                        ...editingUser,
                                        roles: [e.target.value]
                                      })}
                                      className="w-full p-2 border rounded-md"
                                    >
                                      <option value="user">ผู้ใช้ทั่วไป</option>
                                      <option value="admin">แอดมิน</option>
                                      <option value="super_admin">ผู้ดูแลระบบ</option>
                                    </select>
                                  </div>
                                  <Button type="submit" className="w-full">
                                    บันทึกการแก้ไข
                                  </Button>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;