// src/components/AppFooter.tsx
import React from 'react';
import { Mail, Facebook } from 'lucide-react'; // เพิ่ม: นำเข้า Icon จาก Lucide React

const AppFooter = () => {
  const currentYear = new Date().getFullYear(); // ดึงปีปัจจุบันอัตโนมัติ

  return (
    <footer className="bg-background text-foreground border-t border-border py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start text-sm">
          {/* Section 1: Copyright and Project Info */}
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <p className="text-lg font-semibold text-primary mb-1">
              ระบบสืบค้นทะเบียนรถจักรยานยนต์
            </p>
            <p className="text-muted-foreground">
              &copy; {currentYear} All rights reserved.
            </p>
          </div>

          {/* Section 2: Developer and School Info */}
          <div className="mb-4 md:mb-0 text-center md:text-right">
            <p className="font-medium">
              พัฒนาโดย: <span className="text-muted-foreground">นายวีระวัฒน์ โสรมรรค</span>
            </p>
            <p className="font-medium-">
              โรงเรียนอาจสามารถวิทยา
            </p>
             <p className="font-medium-">
              #ว่าที่นักศึกษาพยาบาลที่สร้างเว็บได้นิดหน่อย
            </p>
          </div>

          {/* Section 3: Contact Info and Social Media */}
          <div className="text-center md:text-right">
            <p className="font-medium mb-2">
              ติดต่อเรา:
            </p>
            <div className="flex justify-center md:justify-end items-center space-x-4">
              <a 
                href="mailto:winawathns11@gmail.com" 
                className="text-muted-foreground hover:text-primary-foreground transition-colors flex items-center gap-1"
                title="ส่งอีเมล"
              >
                <Mail className="h-4 w-4" />
                <span>winawathns11@gmail.com</span>
              </a>
              <a 
                href="https://www.fb.com/dev.weerawat" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-primary-foreground transition-colors flex items-center gap-1"
                title="เยี่ยมชม Facebook"
              >
                <Facebook className="h-4 w-4" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;