// src/components/SimpleCaptcha.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void;
  disabled?: boolean; // Add disabled prop
}

export const SimpleCaptcha = ({ onVerify, disabled = false }: SimpleCaptchaProps) => {
  const [captchaCode, setCaptchaCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setUserInput('');
    setIsVerified(false);
    onVerify(false);
  };

  const verifyCaptcha = () => {
    const isValid = userInput === captchaCode;
    setIsVerified(isValid);
    onVerify(isValid);
  };

  useEffect(() => {
    // Only generate captcha if not disabled
    if (!disabled) {
      generateCaptcha();
    }
  }, [disabled]); // Re-generate if disabled status changes

  useEffect(() => {
    if (userInput.length === 6 && !disabled) { // Only verify if not disabled
      verifyCaptcha();
    }
  }, [userInput, disabled]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-100 border-2 border-dashed border-gray-300 p-4 text-center font-mono text-lg font-bold tracking-wider">
          {captchaCode}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={generateCaptcha}
          disabled={disabled} // Disable the refresh button
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <Input
          type="text"
          placeholder="กรอกรหัส Captcha"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value.slice(0, 6))}
          className={`${
            isVerified ? 'border-green-500' : userInput.length === 6 && !isVerified ? 'border-red-500' : ''
          }`}
          disabled={disabled} // Disable the input field
        />
        {isVerified && (
          <p className="text-sm text-green-600 mt-1">✓ ยืนยัน Captcha สำเร็จ</p>
        )}
        {userInput.length === 6 && !isVerified && !disabled && ( // Only show error if not disabled
          <p className="text-sm text-red-600 mt-1">✗ รหัส Captcha ไม่ถูกต้อง</p>
        )}
      </div>
    </div>
  );
};