const CLASS_NAMES = [
  'Hoàng Đình Anh',
  'Nguyễn Hải Anh',
  'Hồ Gia Bảo',
  'Trần Thị Ngọc Bích',
  'Nguyễn Trung Cảnh',
  'Phạm Tiến Dũng',
  'Nguyễn Hồng Đẳng',
  'Hiao - Hà',
  'Siu Hoài',
  'Nguyễn Việt Hoàn',
  'Đinh Đăng Huy',
  'Hoàng Trần Xuân Huy',
  'Lê Thị Thanh Huệ',
  'Đỗ Hoàng Hùng',
  'Bùi Thị Thu Hương',
  'Nguyễn Gia Huy',
  'Hồ Trịnh Quỳnh Hương',
  'Nguyễn Quang Khai',
  'Nguyễn Minh Khang',
  'Phạm Văn Khôi',
  'Nguyễn Thị Hiền Lương',
  'Trần Thị Khánh Ly',
  'Đỗ Đức Nghĩa',
  'Cao Thị Ánh Ngọc',
  'Phạm Như Ngọc',
  'Trần Lê Bảo Ngọc',
  'Phạm Thị Kiều Nhi',
  'Ksor Ninh',
  'Siu - Nunh',
  'Nguyễn Như Quỳnh',
  'Phùng Bá Tâm',
  'Chu Thị Thảo',
  'Ksor Sma',
  'Hoàng Quốc Thiên',
  'Siu Thinh',
  'Trần Thị Phương Thúy',
  'Phạm Vương Huyền Trang',
  'Trần Thị Trà',
  'Nguyễn Ngọc Triều Tiên',
  'Nguyễn Dương Triết',
  'Nguyễn Minh Tuấn',
  'Hoàng Thị Ngọc Uyên',
  'Bùi Anh Tuấn',
  'Trần Triệu Vy',
  'Phạm Ngọc Anh Vũ',
]

export function createSeedStudents() {
  return CLASS_NAMES.map((name, i) => {
    const n = i + 1
    return {
      id: `HS${String(n).padStart(3, '0')}`,
      name,
      code: `0923562${String(n).padStart(4, '0')}`,
      birthDate: '',
      role: 'Học sinh',
      group: n <= 12 ? 1 : n <= 23 ? 2 : n <= 34 ? 3 : 4,
    }
  })
}

export function createSeedRules() {
  return [
    { id: 'r1',  name: 'Đi trễ',                              points: 2 },
    { id: 'r2',  name: 'Không làm bài tập về nhà',            points: 2 },
    { id: 'r3',  name: 'Bỏ áo ngoài quần',                    points: 1 },
    { id: 'r4',  name: 'Nói chuyện riêng trong lớp',          points: 1 },
    { id: 'r5',  name: 'Sử dụng điện thoại trong giờ học',    points: 4 },
    { id: 'r6',  name: 'Không thuộc bài, không học bài',      points: 3 },
    { id: 'r7',  name: 'Mất trật tự, ồn ào trong lớp',        points: 2 },
    { id: 'r8',  name: 'Không thực hiện nhiệm vụ trực nhật',  points: 2 },
    { id: 'r9',  name: 'Trang phục chưa đúng quy định',       points: 1 },
    { id: 'r10', name: 'Vô lễ với giáo viên',                 points: 5 },
    { id: 'r11', name: 'Gây gổ, đánh nhau',                   points: 6 },
    { id: 'r12', name: 'Ăn quà vặt trong lớp',                points: 1 },
  ]
}

export function createSeedViolations() {
  return []
}