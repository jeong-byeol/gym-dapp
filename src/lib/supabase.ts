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
