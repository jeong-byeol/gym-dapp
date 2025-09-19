'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  getTodayAttendance, 
  getAllMembers, 
  getNewMembers, 
  getExpiringMembers, 
  getLowSessionMembers,
  getMemberStats 
} from '@/lib/supabase';
import type { UserData } from '@/lib/supabase';

interface AttendanceWithUser {
  id: string;
  user_id: string;
  check_in_time: string;
  Users: UserData;
}

interface MemberStats {
  totalMembers: number;
  ptMembers: number;
  freeMembers: number;
  todayAttendance: number;
}

export default function AdminPage() {
  // 상태 관리
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'members' | 'alerts'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  
  // 데이터 상태
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceWithUser[]>([]);
  const [allMembers, setAllMembers] = useState<UserData[]>([]);
  const [newMembers, setNewMembers] = useState<UserData[]>([]);
  const [expiringMembers, setExpiringMembers] = useState<UserData[]>([]);
  const [lowSessionMembers, setLowSessionMembers] = useState<UserData[]>([]);

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('대시보드 데이터 로딩 시작...');
      const [statsData, attendanceData, newMembersData, expiringData, lowSessionData] = await Promise.all([
        getMemberStats(),
        getTodayAttendance(),
        getNewMembers(7),
        getExpiringMembers(7),
        getLowSessionMembers(5)
      ]);

      setStats(statsData);
      setTodayAttendance(attendanceData);
      setNewMembers(newMembersData);
      setExpiringMembers(expiringData);
      setLowSessionMembers(lowSessionData);
      
      console.log('대시보드 데이터 로딩 완료');
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error);
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 전체 회원 데이터 로드
  const loadAllMembers = async () => {
    setIsLoading(true);
    try {
      const members = await getAllMembers();
      setAllMembers(members);
    } catch (error) {
      console.error('회원 목록 로딩 실패:', error);
      alert('회원 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'members') {
      loadAllMembers();
    } else if (activeTab === 'attendance') {
      getTodayAttendance().then(setTodayAttendance).catch(console.error);
    }
  }, [activeTab]);

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 상태 표시 컴포넌트
  const MembershipStatus = ({ member }: { member: UserData }) => {
    if (member.membership_type === 'pt') {
      const sessions = member.remain_session || 0;
      return (
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
            PT
          </span>
          <span className={`text-sm ${sessions <= 3 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
            {sessions}회 남음
          </span>
        </div>
      );
    } else {
      const endDate = member.end_date ? new Date(member.end_date) : null;
      const today = new Date();
      const isExpired = endDate && endDate < today;
      const daysLeft = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return (
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
            자유
          </span>
          <span className={`text-sm ${daysLeft <= 7 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
            {isExpired ? '만료됨' : endDate ? `${daysLeft}일 남음` : '무제한'}
          </span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏋️ 헬스장 관리자</h1>
              <p className="text-sm text-gray-600">회원 관리 및 출석 현황</p>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 메뉴 */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: '대시보드', icon: '📊' },
              { id: 'attendance', label: '당일 출석', icon: '📅' },
              { id: 'members', label: '회원 관리', icon: '👥' },
              { id: 'alerts', label: '알림', icon: '🚨' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'dashboard' | 'attendance' | 'members' | 'alerts')}
                className={`flex items-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* 대시보드 탭 */}
        {activeTab === 'dashboard' && !isLoading && (
          <div className="space-y-6">
            {/* 통계 카드들 */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">전체 회원</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}명</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <span className="text-2xl">💪</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">PT 회원</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.ptMembers}명</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <span className="text-2xl">🏃</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">자유이용권</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.freeMembers}명</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">오늘 출석</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.todayAttendance}명</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 알림 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 신규 회원 */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🆕 신규 회원 (최근 7일)</h3>
                <div className="space-y-3">
                  {newMembers.length > 0 ? (
                    newMembers.slice(0, 5).map((member) => (
                      <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.phone}</p>
                        </div>
                        <MembershipStatus member={member} />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">신규 회원이 없습니다.</p>
                  )}
                </div>
              </div>

              {/* 만료 예정 */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ 만료 예정 (7일 이내)</h3>
                <div className="space-y-3">
                  {expiringMembers.length > 0 ? (
                    expiringMembers.slice(0, 5).map((member) => (
                      <div key={member.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.phone}</p>
                        </div>
                        <MembershipStatus member={member} />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">만료 예정 회원이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>

            {/* PT 세션 부족 */}
            {lowSessionMembers.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🚨 PT 세션 부족 (5회 이하)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowSessionMembers.map((member) => (
                    <div key={member.id} className="p-3 bg-orange-50 rounded-lg">
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-600">{member.phone}</p>
                      <MembershipStatus member={member} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 당일 출석 탭 */}
        {activeTab === 'attendance' && !isLoading && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                📅 당일 출석 현황 ({new Date().toLocaleDateString('ko-KR')})
              </h2>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                총 {todayAttendance.length}명
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      회원명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      연락처
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      멤버십
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      출석 시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지갑 주소
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayAttendance.map((attendance) => (
                    <tr key={attendance.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {attendance.Users.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attendance.Users.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <MembershipStatus member={attendance.Users} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(attendance.check_in_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {attendance.Users.wallet_address.slice(0, 8)}...{attendance.Users.wallet_address.slice(-6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {todayAttendance.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">오늘 출석한 회원이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 회원 관리 탭 */}
        {activeTab === 'members' && !isLoading && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">👥 전체 회원 관리</h2>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                총 {allMembers.length}명
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      회원명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      연락처
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      멤버십 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      등록일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지갑 주소
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {member.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <MembershipStatus member={member} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.created_at ? formatDate(member.created_at) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {member.wallet_address.slice(0, 8)}...{member.wallet_address.slice(-6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 알림 탭 */}
        {activeTab === 'alerts' && !isLoading && (
          <div className="space-y-6">
            {/* 만료 예정 회원 상세 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">⏰ 만료 예정 회원</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiringMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{member.name}</h3>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        만료 임박
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{member.phone}</p>
                    <MembershipStatus member={member} />
                    {member.end_date && (
                      <p className="text-xs text-gray-500 mt-2">
                        만료일: {new Date(member.end_date).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                ))}
                {expiringMembers.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">만료 예정 회원이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>

            {/* PT 세션 부족 회원 상세 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🚨 PT 세션 부족 회원</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowSessionMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{member.name}</h3>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        세션 부족
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{member.phone}</p>
                    <MembershipStatus member={member} />
                  </div>
                ))}
                {lowSessionMembers.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">세션 부족 회원이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 신규 회원 상세 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🆕 신규 회원 (최근 7일)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {newMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{member.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        신규
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{member.phone}</p>
                    <MembershipStatus member={member} />
                    {member.created_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        가입일: {new Date(member.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                ))}
                {newMembers.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">신규 회원이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
