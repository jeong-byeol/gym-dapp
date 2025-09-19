import { createClient } from '@supabase/supabase-js';

// Supabase 환경변수에서 URL과 API 키 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 디버깅을 위한 환경변수 상태 로그
console.log('=== Supabase 환경변수 상태 ===');
console.log('SUPABASE_URL 존재:', !!supabaseUrl);
console.log('SUPABASE_URL 길이:', supabaseUrl.length);
console.log('SUPABASE_ANON_KEY 존재:', !!supabaseAnonKey);
console.log('SUPABASE_ANON_KEY 길이:', supabaseAnonKey.length);

// Supabase 클라이언트 생성 (환경변수가 없으면 null 반환)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

console.log('Supabase 클라이언트 초기화 상태:', !!supabase);

// 사용자 데이터 타입 정의
export interface UserData {
  id?: string;
  wallet_address: string;
  name: string;
  phone: string;
  membership_type: 'pt' | 'free';
  start_date?: string | null;
  end_date?: string | null;
  remain_session?: number | null;
  created_at?: string;
}

// 출석 데이터 타입 정의
export interface AttendanceData {
  id?: string;
  user_id: string;
  check_in_time: string;
}

// 사용자 등록 함수
export async function registerUser(userData: Omit<UserData, 'id'>) {
  try {
    // Supabase 클라이언트가 초기화되지 않은 경우
    if (!supabase) {
      throw new Error('Supabase 설정이 필요합니다. 환경변수를 확인해주세요.');
    }

    const { data, error } = await supabase
      .from('Users')
      .insert([userData])
      .select();

    if (error) {
      console.error('Supabase 저장 오류:', error);
      throw error;
    }

    console.log('사용자 등록 성공:', data);
    return data;
  } catch (error) {
    console.error('사용자 등록 실패:', error);
    throw error;
  }
}

// 지갑 주소로 사용자 찾기
export async function getUserByWalletAddress(walletAddress: string) {
  try {
    console.log('=== getUserByWalletAddress 시작 ===');
    console.log('입력 지갑 주소:', walletAddress);
    console.log('Supabase 클라이언트 상태:', !!supabase);
    
    if (!supabase) {
      console.error('Supabase 클라이언트가 초기화되지 않음');
      throw new Error('Supabase 설정이 필요합니다. 환경변수를 확인해주세요.');
    }

    console.log('데이터베이스 쿼리 실행 중...');
    const { data, error } = await supabase
      .from('Users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    console.log('쿼리 결과 - data:', data);
    console.log('쿼리 결과 - error:', error);

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('사용자 조회 오류:', error);
      throw error;
    }

    if (error?.code === 'PGRST116') {
      console.log('사용자를 찾을 수 없음 (PGRST116)');
      return null;
    }

    console.log('사용자 조회 성공:', data);
    return data;
  } catch (error) {
    console.error('사용자 조회 실패:', error);
    throw error;
  }
}

// 자유이용권 출석 체크인
export async function checkInUser(userId: string) {
  try {
    console.log('=== checkInUser 시작 ===');
    console.log('입력 사용자 ID:', userId);
    console.log('Supabase 클라이언트 상태:', !!supabase);
    
    if (!supabase) {
      console.error('Supabase 클라이언트가 초기화되지 않음');
      throw new Error('Supabase 설정이 필요합니다. 환경변수를 확인해주세요.');
    }

    // 오늘 이미 출석했는지 확인
    const today = new Date().toISOString().split('T')[0];
    console.log('오늘 날짜:', today);
    console.log('중복 출석 확인 중...');
    
    const { data: existingAttendance, error: checkError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('check_in_time', `${today}T00:00:00`)
      .lt('check_in_time', `${today}T23:59:59`)
      .single();

    console.log('기존 출석 조회 결과 - data:', existingAttendance);
    console.log('기존 출석 조회 결과 - error:', checkError);

    if (existingAttendance) {
      console.log('이미 오늘 출석함:', existingAttendance);
      throw new Error('이미 오늘 출석체크를 완료했습니다.');
    }

    // 출석 기록 저장
    const checkInTime = new Date().toISOString();
    console.log('새 출석 기록 저장 중...');
    console.log('저장할 데이터:', {
      user_id: userId,
      check_in_time: checkInTime
    });

    const { data, error } = await supabase
      .from('Attendance')
      .insert([{
        user_id: userId,
        check_in_time: checkInTime
      }])
      .select();

    console.log('출석 기록 저장 결과 - data:', data);
    console.log('출석 기록 저장 결과 - error:', error);

    if (error) {
      console.error('출석 체크인 오류:', error);
      throw error;
    }

    console.log('출석 체크인 성공:', data);
    return data;
  } catch (error) {
    console.error('출석 체크인 실패:', error);
    throw error;
  }
}

// PT이용권 세션 차감
export async function updatePTSession(userId: string) {
  try {
    if (!supabase) {
      throw new Error('Supabase 설정이 필요합니다. 환경변수를 확인해주세요.');
    }

    // 현재 남은 세션 수 조회
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('remain_session')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('사용자 세션 조회 오류:', userError);
      throw userError;
    }

    if (!user.remain_session || user.remain_session <= 0) {
      throw new Error('남은 PT 세션이 없습니다.');
    }

    // 세션 수 -1 업데이트
    const { data, error } = await supabase
      .from('Users')
      .update({ remain_session: user.remain_session - 1 })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('PT 세션 차감 오류:', error);
      throw error;
    }

    console.log('PT 세션 차감 성공:', data);
    return data;
  } catch (error) {
    console.error('PT 세션 차감 실패:', error);
    throw error;
  }
}

// ===== ADMIN 기능들 =====

// 1. 당일 출석 인원 조회
export const getTodayAttendance = async () => {
  console.log('=== 당일 출석 인원 조회 시작 ===');
  
  if (!supabase) {
    console.error('Supabase 클라이언트가 초기화되지 않았습니다');
    throw new Error('데이터베이스 연결 실패');
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
  console.log('조회 날짜:', today);

  const { data, error } = await supabase
    .from('Attendance')
    .select(`
      *,
      Users (
        id,
        name,
        phone,
        membership_type,
        wallet_address
      )
    `)
    .gte('check_in_time', `${today}T00:00:00.000Z`)
    .lt('check_in_time', `${today}T23:59:59.999Z`)
    .order('check_in_time', { ascending: false });

  if (error) {
    console.error('당일 출석 조회 실패:', error);
    throw new Error(`당일 출석 조회 실패: ${error.message}`);
  }

  console.log('당일 출석 조회 성공:', data?.length, '명');
  return data || [];
};

// 2. 전체 회원 목록 조회 (상태 포함)
export const getAllMembers = async () => {
  console.log('=== 전체 회원 목록 조회 시작 ===');
  
  if (!supabase) {
    console.error('Supabase 클라이언트가 초기화되지 않았습니다');
    throw new Error('데이터베이스 연결 실패');
  }

  const { data, error } = await supabase
    .from('Users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('회원 목록 조회 실패:', error);
    throw new Error(`회원 목록 조회 실패: ${error.message}`);
  }

  console.log('회원 목록 조회 성공:', data?.length, '명');
  return data || [];
};

// 3. 신규 등록 회원 조회 (최근 7일)
export const getNewMembers = async (days: number = 7) => {
  console.log('=== 신규 등록 회원 조회 시작 ===', `최근 ${days}일`);
  
  if (!supabase) {
    console.error('Supabase 클라이언트가 초기화되지 않았습니다');
    throw new Error('데이터베이스 연결 실패');
  }

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  const dateLimitString = dateLimit.toISOString();

  const { data, error } = await supabase
    .from('Users')
    .select('*')
    .gte('created_at', dateLimitString)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('신규 회원 조회 실패:', error);
    throw new Error(`신규 회원 조회 실패: ${error.message}`);
  }

  console.log('신규 회원 조회 성공:', data?.length, '명');
  return data || [];
};

// 4. 만료 예정 회원 조회 (자유이용권 만료 임박)
export const getExpiringMembers = async (days: number = 7) => {
  console.log('=== 만료 예정 회원 조회 시작 ===', `${days}일 이내`);
  
  if (!supabase) {
    console.error('Supabase 클라이언트가 초기화되지 않았습니다');
    throw new Error('데이터베이스 연결 실패');
  }

  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateString = futureDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('Users')
    .select('*')
    .eq('membership_type', 'free')
    .gte('end_date', today) // 아직 만료되지 않음
    .lte('end_date', futureDateString) // 지정된 날짜 이내 만료
    .order('end_date', { ascending: true });

  if (error) {
    console.error('만료 예정 회원 조회 실패:', error);
    throw new Error(`만료 예정 회원 조회 실패: ${error.message}`);
  }

  console.log('만료 예정 회원 조회 성공:', data?.length, '명');
  return data || [];
};

// 5. PT 세션 부족 회원 조회 (5회 이하)
export const getLowSessionMembers = async (sessionLimit: number = 5) => {
  console.log('=== PT 세션 부족 회원 조회 시작 ===', `${sessionLimit}회 이하`);
  
  if (!supabase) {
    console.error('Supabase 클라이언트가 초기화되지 않았습니다');
    throw new Error('데이터베이스 연결 실패');
  }

  const { data, error } = await supabase
    .from('Users')
    .select('*')
    .eq('membership_type', 'pt')
    .lte('remain_session', sessionLimit)
    .order('remain_session', { ascending: true });

  if (error) {
    console.error('PT 세션 부족 회원 조회 실패:', error);
    throw new Error(`PT 세션 부족 회원 조회 실패: ${error.message}`);
  }

  console.log('PT 세션 부족 회원 조회 성공:', data?.length, '명');
  return data || [];
};

// 6. 회원 통계 정보 조회
export const getMemberStats = async () => {
  console.log('=== 회원 통계 정보 조회 시작 ===');
  
  if (!supabase) {
    console.error('Supabase 클라이언트가 초기화되지 않았습니다');
    throw new Error('데이터베이스 연결 실패');
  }

  // 전체 회원 수
  const { count: totalMembers, error: totalError } = await supabase
    .from('Users')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('전체 회원 수 조회 실패:', totalError);
    throw new Error(`전체 회원 수 조회 실패: ${totalError.message}`);
  }

  // PT 이용권 회원 수
  const { count: ptMembers, error: ptError } = await supabase
    .from('Users')
    .select('*', { count: 'exact', head: true })
    .eq('membership_type', 'pt');

  if (ptError) {
    console.error('PT 회원 수 조회 실패:', ptError);
    throw new Error(`PT 회원 수 조회 실패: ${ptError.message}`);
  }

  // 자유이용권 회원 수
  const { count: freeMembers, error: freeError } = await supabase
    .from('Users')
    .select('*', { count: 'exact', head: true })
    .eq('membership_type', 'free');

  if (freeError) {
    console.error('자유이용권 회원 수 조회 실패:', freeError);
    throw new Error(`자유이용권 회원 수 조회 실패: ${freeError.message}`);
  }

  // 오늘 출석 수
  const today = new Date().toISOString().split('T')[0];
  const { count: todayAttendance, error: attendanceError } = await supabase
    .from('Attendance')
    .select('*', { count: 'exact', head: true })
    .gte('check_in_time', `${today}T00:00:00.000Z`)
    .lt('check_in_time', `${today}T23:59:59.999Z`);

  if (attendanceError) {
    console.error('오늘 출석 수 조회 실패:', attendanceError);
    throw new Error(`오늘 출석 수 조회 실패: ${attendanceError.message}`);
  }

  const stats = {
    totalMembers: totalMembers || 0,
    ptMembers: ptMembers || 0,
    freeMembers: freeMembers || 0,
    todayAttendance: todayAttendance || 0,
  };

  console.log('회원 통계 조회 성공:', stats);
  return stats;
};
