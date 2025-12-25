// 祝日対応スタッフ設定API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StaffService } from '@/lib/services/StaffService';
import { getCurrentStaff } from '@/lib/auth/helpers';

/**
 * PUT /api/staff/holiday-staff
 * 祝日対応スタッフフラグを更新
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { staffId, isHolidayStaff } = body;

    // バリデーション
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'スタッフIDは必須です' },
        { status: 400 }
      );
    }

    if (typeof isHolidayStaff !== 'boolean') {
      return NextResponse.json(
        { success: false, error: '祝日対応フラグはboolean型である必要があります' },
        { status: 400 }
      );
    }

    // 祝日対応フラグを更新
    const staffService = new StaffService(supabase);
    const updatedStaff = await staffService.setHolidayStaff(staffId, isHolidayStaff);

    return NextResponse.json({
      success: true,
      data: {
        staffId: updatedStaff.id,
        isHolidayStaff: updatedStaff.is_holiday_staff,
      },
    });
  } catch (error: any) {
    console.error('祝日対応スタッフ設定エラー:', error);
    
    if (error.message === 'スタッフが見つかりません') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: '祝日対応スタッフの設定に失敗しました' },
      { status: 500 }
    );
  }
}
