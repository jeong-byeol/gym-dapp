'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract } from 'wagmi';
import { useState } from 'react';
import MembershipABI from '@/abi/Membership.json';
import { registerUser, UserData } from '@/lib/supabase';

export default function RegisterPage() {
  const { address, isConnected } = useAccount(); // 현재 연결된 지갑 주소 가져오기
  const [membershipType, setMembershipType] = useState<'pt' | 'free'>('pt'); // 멤버십 유형 선택 상태
  const [ptOption, setPtOption] = useState<'10' | '20' | '30'>('10'); // PT 횟수 옵션
  const [freeOption, setFreeOption] = useState<'1' | '3' | '6'>('1'); // 자유이용권 기간 옵션
  const [name, setName] = useState(''); // 이름
  const [phone, setPhone] = useState(''); // 전화번호
  const [isLoading, setIsLoading] = useState(false); // 등록 진행 중 상태
  const { error, isPending, writeContract } = useWriteContract();

  const contractAddress = process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT;
  
  // 멤버십 등록 처리 함수
  const handleRegister = async () => {
    if (!isConnected) {
      alert('먼저 지갑을 연결해주세요!');
      return;
    }

    // 입력 필드 유효성 검사
    if (!name.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }

    if (!phone.trim()) {
      alert('전화번호를 입력해주세요!');
      return;
    }

    // 전화번호 형식 검사 (간단한 패턴)
    const phoneRegex = /^[0-9-+\s()]{10,}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      alert('올바른 전화번호 형식을 입력해주세요!');
      return;
    }

    try {
      setIsLoading(true);
      
      // selectedOption을 정수로 변환 (1,3,6 = 자유이용권 개월수, 10,20,30 = PT이용권 횟수)
      const selectedOption = parseInt(membershipType === 'pt' ? ptOption : freeOption);
      
      // 날짜 계산 함수
      const calculateDates = (membershipType: 'pt' | 'free', option: number) => {
        const today = new Date();
        const startDate = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        
        if (membershipType === 'free') {
          // 자유이용권: 시작일과 종료일 계산
          const endDate = new Date(today);
          endDate.setMonth(endDate.getMonth() + option); // 선택한 개월수만큼 더하기
          
          return {
            start_date: startDate,
            end_date: endDate.toISOString().split('T')[0],
            remain_session: null
          };
        } else {
          // PT이용권: 남은 세션 횟수만 저장
          return {
            start_date: null,
            end_date: null,
            remain_session: option
          };
        }
      };
      
      // 날짜 및 세션 정보 계산
      const dateInfo = calculateDates(membershipType, selectedOption);
      
      // Supabase에 저장할 사용자 데이터 준비
      const userData: Omit<UserData, 'id'> = {
        wallet_address: address!,
        name: name.trim(),
        phone: phone.trim(),
        membership_type: membershipType,
        ...dateInfo // 날짜 정보 또는 세션 횟수 정보 저장
      };

      console.log('Supabase에 저장할 데이터:', userData);

      // 1. Supabase에 사용자 데이터 저장
      await registerUser(userData);

      // 2. 스마트 컨트랙트 NFT 발급
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: MembershipABI,
        functionName: "mint",
        args: [address, selectedOption],
      });
    
      alert(`${membershipType === 'pt' ? 'PT이용권' : '자유이용권'} 등록 및 NFT 발급이 완료되었습니다!`);
    } catch (error) {
      console.error('등록 실패:', error);
      
      // 에러 타입에 따른 구체적인 메시지 제공
      if (error instanceof Error) {
        if (error.message.includes('Supabase')) {
          alert('데이터베이스 저장 중 오류가 발생했습니다. 환경설정을 확인해주세요.');
        } else if (error.message.includes('User rejected')) {
          alert('트랜잭션이 취소되었습니다.');
        } else {
          alert(`등록 중 오류가 발생했습니다: ${error.message}`);
        }
      } else {
        alert('등록 중 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">헬스장 등록</h1>
            <p className="text-gray-600 mb-8">
              헬스장 이용권을 등록하세요
            </p>

            {/* 지갑 연결 버튼 */}
            <div className="mb-8">
              <ConnectButton />
            </div>

            {isConnected ? (
              <div className="space-y-6 text-left">
                {/* 연결된 지갑 주소 표시 */}
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600">연결된 지갑</p>
                  <p className="font-mono text-sm text-gray-900 mt-1">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>

                {/* 개인정보 입력 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">개인정보</h3>
                  
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      이름 *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="이름을 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      전화번호 *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>

                {/* 이용권 유형 선택 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">이용권 유형</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      membershipType === 'pt' 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="membershipType"
                        value="pt"
                        checked={membershipType === 'pt'}
                        onChange={(e) => setMembershipType(e.target.value as 'pt')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">PT 이용권</p>
                        <p className="text-sm text-gray-600 mt-1">개인 트레이닝</p>
                      </div>
                    </label>

                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      membershipType === 'free' 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="membershipType"
                        value="free"
                        checked={membershipType === 'free'}
                        onChange={(e) => setMembershipType(e.target.value as 'free')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">자유 이용권</p>
                        <p className="text-sm text-gray-600 mt-1">시설 자유 이용</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 옵션 선택 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {membershipType === 'pt' ? 'PT 횟수' : '이용 기간'}
                  </h3>
                  
                  {membershipType === 'pt' ? (
                    <div className="grid grid-cols-3 gap-3">
                      {['10', '20', '30'].map((count) => (
                        <label key={count} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          ptOption === count 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            name="ptOption"
                            value={count}
                            checked={ptOption === count}
                            onChange={(e) => setPtOption(e.target.value as '10' | '20' | '30')}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">{count}회</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {count === '10' ? '300,000원' : count === '20' ? '550,000원' : '750,000원'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {['1', '3', '6'].map((months) => (
                        <label key={months} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          freeOption === months 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            name="freeOption"
                            value={months}
                            checked={freeOption === months}
                            onChange={(e) => setFreeOption(e.target.value as '1' | '3' | '6')}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">{months}개월</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {months === '1' ? '80,000원' : months === '3' ? '210,000원' : '360,000원'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* 등록 버튼 */}
                <button
                  onClick={handleRegister}
                  disabled={isLoading || isPending || !name.trim() || !phone.trim()}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading || isPending ? '결재 중...' : '결재 및 NFT 발급'}
                </button>

                {/* 상태 메시지 */}
                {isPending && <p className="text-center text-blue-600">결재 처리 중...</p>}
                {error && (
                  <p className="text-center text-red-600">
                    오류: {error.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-600">
                <p>헬스장 등록을 위해 먼저 지갑을 연결해주세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
