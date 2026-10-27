import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export const questionsData = [
  {
    id: 1,
    title: "Câu 1 — Tiếp tuyến của đường cong ẩn",
    topic: "Implicit differentiation + tangent",
    part: "Phần I (1-10)",
    statement: "Cho đường cong xác định bởi: $x^2 + xy + y^2 = 7$. Tìm phương trình tiếp tuyến của đường cong tại điểm $P = (2, 1)$.",
    solution: "Lấy đạo hàm hai vế theo $x$: $2x + \\frac{d}{dx}(xy) + 2yy' = 0$. Vì $\\frac{d}{dx}(xy) = xy' + y$, nên $2x + xy' + y + 2yy' = 0$. Nhóm các số hạng chứa $y'$: $(x + 2y)y' = -(2x + y) \\implies y' = -\\frac{2x + y}{x + 2y}$. Tại $P(2,1)$: $m = y'(2,1) = -\\frac{4+1}{2+2} = -\\frac{5}{4}$. Phương trình tiếp tuyến: $y - 1 = -\\frac{5}{4}(x - 2) \\implies y = -\\frac{5}{4}x + \\frac{7}{2}$.",
    answerKey: "y = -\\frac{5}{4}x + \\frac{7}{2}",
    hints: ["Implicit differentiation", "Derivative of product xy", "Point-slope form y - y0 = m(x - x0)"],
    detailedHint: "1. Lấy đạo hàm hai vế theo x, nhớ quy tắc tích cho số hạng xy: d/dx(xy) = xy' + y.\n2. Gom các số hạng chứa y' về một vế để rút ra biểu thức y'.\n3. Thay tọa độ điểm P(2,1) vào y' để tính hệ số góc m.\n4. Dùng phương trình tiếp tuyến: y - y0 = m(x - x0)."
  },
  {
    id: 2,
    title: "Câu 2 — Xấp xỉ tích phân bằng Composite Trapezoidal Rule",
    topic: "Composite Trapezoidal Rule",
    part: "Phần I (1-10)",
    statement: "Cho bảng giá trị:\n$x$: 0 | 1 | 2 | 3 | 4\n$f(x)$: 2 | 4 | 5 | 8 | 9\nDùng Composite Trapezoidal Rule để xấp xỉ $\\int_0^4 f(x) dx$.",
    solution: "Khoảng cách giữa hai điểm liên tiếp $h = 1$. Công thức hình thang tổng hợp: $T_n = \\frac{h}{2}[f_0 + 2f_1 + 2f_2 + \\dots + 2f_{n-1} + f_n]$. $T_4 = \\frac{1}{2}[2 + 2(4) + 2(5) + 2(8) + 9] = \\frac{1}{2}(45) = 22.5$.",
    answerKey: "22.5",
    hints: ["Composite Trapezoidal Rule formula", "h/2 * [f0 + 2f1 + 2f2 + 2f3 + f4]"],
    detailedHint: "1. Xác định bước nhảy h giữa các điểm x: h = 1.\n2. Áp dụng công thức hình thang tổng hợp: T_n = (h/2) * [f0 + 2f1 + 2f2 + 2f3 + f4].\n3. Nhân đôi tất cả các giá trị f(x) ở giữa và cộng với biên f0, f4 rồi nhân với h/2."
  },
  {
    id: 3,
    title: "Câu 3 — Đạo hàm của hàm ẩn",
    topic: "Implicit differentiation",
    part: "Phần I (1-10)",
    statement: "Cho: $x^3 + y^3 = 9xy$. Tìm $\\frac{dy}{dx}$.",
    solution: "Lấy đạo hàm hai vế: $3x^2 + 3y^2 y' = 9(xy)' = 9(xy' + y)$. Chuyển vế và đặt $y'$ ra ngoài: $(3y^2 - 9x)y' = 9y - 3x^2 \\implies \\frac{dy}{dx} = \\frac{3y - x^2}{y^2 - 3x}$.",
    answerKey: "\\frac{3y - x^2}{y^2 - 3x}",
    hints: ["Differentiate both sides with respect to x", "Product rule for xy"],
    detailedHint: "1. Đạo hàm theo x từng số hạng: (x^3)' = 3x^2, (y^3)' = 3y^2 y', (9xy)' = 9(xy' + y).\n2. Gom các số hạng có chứa y' về vế trái, các số hạng còn lại về vế phải.\n3. Đặt y' ra ngoài làm nhân tử chung và chia hệ số để thu được dy/dx."
  },
  {
    id: 4,
    title: "Câu 4 — Related Rates",
    topic: "Related Rates (đạo hàm theo t)",
    part: "Phần I (1-10)",
    statement: "Một chiếc thang dài 13 m tựa vào tường. Đầu dưới của thang trượt ra xa tường với tốc độ $\\frac{dx}{dt} = 3$ m/s. Tại thời điểm $x = 5$ m, tìm tốc độ chuyển động của đầu trên của thang.",
    solution: "Gọi $x$ là khoảng cách chân thang, $y$ là độ cao đầu thang. Theo định lý Pythagore: $x^2 + y^2 = 13^2 = 169$. Lấy đạo hàm theo $t$: $2x \\frac{dx}{dt} + 2y \\frac{dy}{dt} = 0 \\implies x \\frac{dx}{dt} + y \\frac{dy}{dt} = 0$. Khi $x = 5$, $5^2 + y^2 = 169 \\implies y = 12$. Thay vào: $5(3) + 12 \\frac{dy}{dt} = 0 \\implies \\frac{dy}{dt} = -\\frac{15}{12} = -\\frac{5}{4}$ m/s (trượt xuống tốc độ $\\frac{5}{4}$ m/s).",
    answerKey: "-\\frac{5}{4}",
    hints: ["Pythagorean theorem x^2 + y^2 = 13^2", "Differentiate with respect to time t"],
    detailedHint: "1. Lập quan hệ hình học: x^2 + y^2 = 13^2.\n2. Lấy đạo hàm hai vế theo thời gian t: 2x(dx/dt) + 2y(dy/dt) = 0.\n3. Thay x = 5 vào định lý Pythagore để tìm y = 12.\n4. Thay dx/dt = 3, x = 5, y = 12 vào phương trình đạo hàm để tìm dy/dt."
  },
  {
    id: 5,
    title: "Câu 5 — Newton Method",
    topic: "Newton's Method",
    part: "Phần I (1-10)",
    statement: "Dùng phương pháp Newton để tìm nghiệm xấp xỉ của $f(x) = x^3 - 2x - 2 = 0$. Biết $x_1 = 2$. Tính $x_2$ và $x_3$.",
    solution: "Công thức Newton: $x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}$. Ta có $f'(x) = 3x^2 - 2$. Bước 1: $x_1 = 2 \\implies f(2) = 2, f'(2) = 10 \\implies x_2 = 2 - \\frac{2}{10} = 1.8$. Bước 2: $f(1.8) = 0.232, f'(1.8) = 7.72 \\implies x_3 = 1.8 - \\frac{0.232}{7.72} \\approx 1.76995$.",
    answerKey: "x_2 = 1.8, x_3 = 1.76995",
    hints: ["Newton formula x_{n+1} = x_n - f(x_n)/f'(x_n)", "Derivative f'(x) = 3x^2 - 2"],
    detailedHint: "1. Tính đạo hàm f'(x) = 3x^2 - 2.\n2. Áp dụng công thức lặp x_{n+1} = x_n - f(x_n)/f'(x_n).\n3. Tính x2 từ x1 = 2.\n4. Dùng x2 = 1.8 để tính tiếp x3."
  },
  {
    id: 6,
    title: "Câu 6 — Tính định thức của ma trận",
    topic: "Cofactor expansion determinant",
    part: "Phần I (1-10)",
    statement: "Cho $A = \\begin{pmatrix} 1 & 2 & 3 \\\\ 0 & 5 & 1 \\\\ 2 & 0 & 4 \\end{pmatrix}$. Tính $\\det(A)$.",
    solution: "Khai triển theo hàng đầu: $\\det(A) = 1\\begin{vmatrix} 5 & 1 \\\\ 0 & 4 \\end{vmatrix} - 2\\begin{vmatrix} 0 & 1 \\\\ 2 & 4 \\end{vmatrix} + 3\\begin{vmatrix} 0 & 5 \\\\ 2 & 0 \\end{vmatrix} = 1(20) - 2(-2) + 3(-10) = 20 + 4 - 30 = -6$.",
    answerKey: "-6",
    hints: ["Expand along the first row", "2x2 determinant calculation"],
    detailedHint: "1. Khai triển theo hàng 1 với dấu đan xen (+, -, +).\n2. Tính định thức các ma trận con cấp 2 ad - bc.\n3. Tổng hợp lại để ra kết quả det(A)."
  },
  {
    id: 7,
    title: "Câu 7 — Một entry của ma trận nghịch đảo",
    topic: "Inverse matrix entry (Cofactor / det)",
    part: "Phần I (1-10)",
    statement: "Cho $A = \\begin{pmatrix} 2 & 1 & 0 \\\\ 0 & 1 & 2 \\\\ 1 & 0 & 1 \\end{pmatrix}$. Tìm entry $(A^{-1})_{23}$.",
    solution: "Công thức $(A^{-1})_{ij} = \\frac{C_{ji}}{\\det(A)}$. Cần $(A^{-1})_{23}$ ta tính $C_{32}$. Trước hết $\\det(A) = 2(1) - 1(0 - 2) = 4$. Xóa hàng 3 cột 2: $M_{32} = \\begin{vmatrix} 2 & 0 \\\\ 0 & 2 \\end{vmatrix} = 4 \\implies C_{32} = (-1)^{3+2}M_{32} = -4$. Do đó $(A^{-1})_{23} = \\frac{-4}{4} = -1$.",
    answerKey: "-1",
    hints: ["Formula (A^{-1})_{ij} = C_{ji} / det(A)", "Cofactor C_{32} and det(A)"],
    detailedHint: "1. Nhớ công thức (A^{-1})_{ij} = C_{ji} / det(A).\n2. Để tìm vị trí (2,3), cần tính cofactor C_{32}.\n3. Tính det(A) và định thức con M_{32} sau khi xóa hàng 3 cột 2."
  },
  {
    id: 8,
    title: "Câu 8 — Gaussian Elimination và hạng ma trận",
    topic: "Gaussian Elimination & Rank",
    part: "Phần I (1-10)",
    statement: "Cho $A = \\begin{pmatrix} 1 & 2 & 3 \\\\ 2 & 4 & 6 \\\\ 1 & 3 & 4 \\end{pmatrix}$. Dùng Gaussian Elimination để xác định $\\text{rank}(A)$.",
    solution: "Thực hiện $R_2 \\leftarrow R_2 - 2R_1, R_3 \\leftarrow R_3 - R_1 \\implies \\begin{pmatrix} 1 & 2 & 3 \\\\ 0 & 0 & 0 \\\\ 0 & 1 & 1 \\end{pmatrix}$. Đổi $R_2$ và $R_3$: $\\begin{pmatrix} 1 & 2 & 3 \\\\ 0 & 1 & 1 \\\\ 0 & 0 & 0 \\end{pmatrix}$. Có 2 hàng khác không $\\implies \\text{rank}(A) = 2$.",
    answerKey: "2",
    hints: ["Row operations", "Number of non-zero rows / pivots"],
    detailedHint: "1. Khử các phần tử dưới phần tử cơ sở bằng phép biến đổi hàng.\n2. Đưa về ma trận bậc thang (REF).\n3. Đếm số hàng khác không chính là hạng rank(A)."
  },
  {
    id: 9,
    title: "Câu 9 — Một entry của tích hai ma trận",
    topic: "Matrix product row x column",
    part: "Phần I (1-10)",
    statement: "Cho $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 0 \\\\ 2 & 1 \\end{pmatrix}, B = \\begin{pmatrix} 2 & 1 & 0 & 3 \\\\ 1 & 2 & 4 & 0 \\end{pmatrix}$. Đặt $C = AB$. Tính entry $C_{32}$.",
    solution: "$C_{ij} = \\text{hàng } i \\text{ của } A \\cdot \\text{cột } j \\text{ của } B$. Hàng 3 của $A$: $(2, 1)$. Cột 2 của $B$: $(1, 2)^T$. Do đó $C_{32} = 2(1) + 1(2) = 4$.",
    answerKey: "4",
    hints: ["Row 3 of A multiplied by column 2 of B", "Dot product"],
    detailedHint: "1. Entry C_{32} là tích vô hướng của hàng 3 ma trận A và cột 2 ma trận B.\n2. Lấy từng phần tử tương ứng nhân với nhau rồi cộng lại."
  },
  {
    id: 10,
    title: "Câu 10 — Tính định thức từ định thức đã biết",
    topic: "Determinant of inverse matrix",
    part: "Phần I (1-10)",
    statement: "Cho $A$ là ma trận vuông cấp 3 và $\\det(A) = -3$. Tính $\\det(A^{-1})$.",
    solution: "Tính chất: $\\det(A^{-1}) = \\frac{1}{\\det(A)} = \\frac{1}{-3} = -\\frac{1}{3}$.",
    answerKey: "-\\frac{1}{3}",
    hints: ["det(A^{-1}) = 1 / det(A)"],
    detailedHint: "Sử dụng tính chất định thức của ma trận nghịch đảo: det(A^{-1}) = 1 / det(A)."
  },
  {
    id: 11,
    title: "Câu 11 — Đạo hàm của tích phân có cận tham số",
    topic: "Leibniz Rule for parameter integrals",
    part: "Phần II (11-20)",
    statement: "Cho $F(x) = \\int_{x}^{x^2} (t^2 + 1) dt$. Tính $F'(x)$.",
    solution: "Sử dụng công thức Leibniz: $\\frac{d}{dx}\\int_{a(x)}^{b(x)} f(t)dt = f(b(x))b'(x) - f(a(x))a'(x)$. $F'(x) = ((x^2)^2 + 1)(2x) - (x^2 + 1)(1) = 2x(x^4 + 1) - (x^2 + 1) = 2x^5 - x^2 + 2x - 1$.",
    answerKey: "2x^5 - x^2 + 2x - 1",
    hints: ["Leibniz integral rule", "Substitute upper and lower limits and multiply by their derivatives"],
    detailedHint: "Áp dụng công thức Leibniz: thay cận trên vào hàm dưới dấu tích phân nhân với đạo hàm cận trên, trừ đi thay cận dưới nhân đạo hàm cận dưới."
  },
  {
    id: 12,
    title: "Câu 12 — Tính tích phân bằng Simpson's Rule",
    topic: "Composite Simpson's Rule",
    part: "Phần II (11-20)",
    statement: "Cho bảng giá trị:\n$x$: 0 | 1 | 2 | 3 | 4\n$f(x)$: 1 | 4 | 2 | 5 | 3\nDùng Composite Simpson's Rule để xấp xỉ $\\int_0^4 f(x) dx$.",
    solution: "$n = 4$ (chẵn), $h = 1$. Công thức Simpson: $S_n = \\frac{h}{3}[f_0 + f_n + 4(f_1 + f_3) + 2f_2]$. $S_4 = \\frac{1}{3}[1 + 3 + 4(4 + 5) + 2(2)] = \\frac{1}{3}[4 + 36 + 4] = \\frac{44}{3} \\approx 14.667$.",
    answerKey: "\\frac{44}{3}",
    hints: ["Simpson's rule h/3 * [f0 + 4f1 + 2f2 + 4f3 + f4]"],
    detailedHint: "Áp dụng công thức Simpson tổng hợp với n=4 chẵn: S_4 = (h/3) * [f0 + f4 + 4(f1 + f3) + 2f2]."
  },
  {
    id: 13,
    title: "Câu 13a & 13b — Displacement vs Total Distance",
    topic: "Displacement and Total Distance",
    part: "Phần II (11-20)",
    statement: "Một vật chuyển động với vận tốc $v(t) = 3t^2 - 4t + 1, 0 \\le t \\le 2$. (a) Tính displacement trong khoảng từ $t=0$ đến $t=2$. (b) Tính total distance mà vật đã đi được.",
    solution: "(a) Displacement = $\\int_0^2 (3t^2 - 4t + 1) dt = [t^3 - 2t^2 + t]_0^2 = (8 - 8 + 2) - 0 = 2$. (b) Distance = $\\int_0^2 |3t^2 - 4t + 1| dt$. Phân tích $3t^2 - 4t + 1 = (3t-1)(t-1)$, nghiệm $t = 1/3, t = 1$. Chia tích phân trên các khoảng dấu dương âm: $D = \\int_0^{1/3} v dt - \\int_{1/3}^1 v dt + \\int_1^2 v dt = \\frac{4}{27} + \\frac{4}{27} + 2 = \\frac{62}{27}$.",
    answerKey: "\\text{Displacement} = 2, \\text{Distance} = \\frac{62}{27}",
    hints: ["Displacement is integral of v(t)", "Distance is integral of |v(t)| (split by roots)"],
    detailedHint: "1. Displacement là tích phân trực tiếp của v(t).\n2. Total distance là tích phân trị tuyệt đối |v(t)|, cần tìm nghiệm của v(t) để tách khoảng tích phân."
  },
  {
    id: 14,
    title: "Câu 14 — Hội tụ của tích phân suy rộng bằng phương pháp so sánh",
    topic: "Improper integral Comparison Test",
    part: "Phần II (11-20)",
    statement: "Xét tích phân suy rộng $\\int_1^\\infty \\frac{1}{x^2 + x} dx$. Sử dụng phương pháp so sánh để xác định tích phân hội tụ hay phân kỳ.",
    solution: "Với $x \\ge 1$, $x^2 + x > x^2 \\implies \\frac{1}{x^2+x} < \\frac{1}{x^2}$. Vì $\\int_1^\\infty \\frac{1}{x^2}dx$ hội tụ (p-type với $p = 2 > 1$), nên theo Comparison Test, tích phân đã cho hội tụ.",
    answerKey: "\\text{Hội tụ (Convergent)}",
    hints: ["Comparison test with 1/x^2", "p-integral convergence (p > 1)"],
    detailedHint: "Đánh giá mẫu số lớn hơn x^2 để suy ra phân thức nhỏ hơn 1/x^2. Kết hợp với tính hội tụ của tích phân p-type (p=2 > 1)."
  },
  {
    id: 15,
    title: "Câu 15 — Đạo hàm của hàm phân thức",
    topic: "Quotient Rule",
    part: "Phần II (11-20)",
    statement: "Cho $f(x) = \\frac{x^2 + 1}{x - 2}$. Tính $f'(x)$.",
    solution: "Sử dụng Quotient Rule $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$. $u = x^2+1, v = x-2 \\implies u'=2x, v'=1$. $f'(x) = \\frac{2x(x-2) - (x^2+1)(1)}{(x-2)^2} = \\frac{2x^2 - 4x - x^2 - 1}{(x-2)^2} = \\frac{x^2 - 4x - 1}{(x-2)^2}$.",
    answerKey: "\\frac{x^2 - 4x - 1}{(x-2)^2}",
    hints: ["Quotient rule formula (u'v - uv') / v^2"],
    detailedHint: "Áp dụng quy tắc đạo hàm thương số: (u/v)' = (u'v - uv') / v^2."
  },
  {
    id: 16,
    title: "Câu 16 — Tính định thức có chứa tham số bằng tính chất của định thức",
    topic: "Determinant with parameter & row operations",
    part: "Phần II (11-20)",
    statement: "Cho $D = \\begin{vmatrix} a & 1 & 1 \\\\ 1 & a & 1 \\\\ 1 & 1 & a \\end{vmatrix}$. Tính $D$ bằng cách sử dụng các tính chất của định thức.",
    solution: "Biến đổi $R_2 \\leftarrow R_2 - R_1, R_3 \\leftarrow R_3 - R_1 \\implies \\begin{vmatrix} a & 1 & 1 \\\\ 1-a & a-1 & 0 \\\\ 1-a & 0 & a-1 \\end{vmatrix}$. Đưa $(a-1)$ ra khỏi hàng 2 và hàng 3 $\\implies D = (a-1)^2 \\begin{vmatrix} a & 1 & 1 \\\\ -1 & 1 & 0 \\\\ -1 & 0 & 1 \\end{vmatrix} = (a-1)^2(a + 2)$.",
    answerKey: "(a - 1)^2(a + 2)",
    hints: ["Row subtraction R2 - R1, R3 - R1", "Factor out (a-1)"],
    detailedHint: "Trừ hàng 2 và hàng 3 cho hàng 1 để làm xuất hiện nhân tử chung (a-1), đưa ra ngoài rồi tính định thức còn lại."
  },
  {
    id: 17,
    title: "Câu 17 — Nhận diện ma trận bậc thang và bậc thang rút gọn",
    topic: "REF and RREF identification",
    part: "Phần II (11-20)",
    statement: "Hãy xác định mỗi ma trận dưới đây là: REF, RREF, hay không phải ma trận bậc thang:\nA = $\\begin{pmatrix} 1 & 2 & 0 \\\\ 0 & 1 & 3 \\\\ 0 & 0 & 1 \\end{pmatrix}$, B = $\\begin{pmatrix} 1 & 0 & 2 \\\\ 0 & 1 & -1 \\\\ 0 & 0 & 0 \\end{pmatrix}$, C = $\\begin{pmatrix} 1 & 2 \\\\ 0 & 0 \\end{pmatrix}$, D = $\\begin{pmatrix} 1 & 0 & 1 \\\\ 0 & 0 & 0 \\\\ 0 & 1 & 2 \\end{pmatrix}$.",
    solution: "A: REF (pivots move right, zero rows at bottom, but elements above pivots are not 0 -> not RREF). B: RREF (pivots are 1, only non-zero in pivot columns). C: RREF. D: Không phải REF (hàng 0 xuất hiện trước hàng khác không).",
    answerKey: "A: REF, B: RREF, C: RREF, D: Không phải REF",
    hints: ["Check pivot positions and zeros above/below pivots"],
    detailedHint: "Kiểm tra định nghĩa REF (hàng không nằm dưới, pivot dịch phải) và RREF (pivot bằng 1 và các phần tử trên/dưới cột pivot đều bằng 0)."
  },
  {
    id: 18,
    title: "Câu 18 — Xác định hệ vectơ độc lập hay phụ thuộc tuyến tính",
    topic: "Linear independence & dependence",
    part: "Phần II (11-20)",
    statement: "Xác định tính độc lập/phụ thuộc tuyến tính cho:\n(a) Ba vectơ trong $\\mathbb{R}^3$: $v_1 = (1,0,2)^T, v_2 = (0,1,1)^T, v_3 = (2,1,0)^T$.\n(b) 4 vectơ trong $\\mathbb{R}^3$.\n(c) Hai vectơ $v_1 = (1,0,1)^T, v_2 = (0,1,1)^T$.\n(d) $v_1 = (1,2,3)^T, v_2 = (2,4,6)^T$.",
    solution: "(a) Lập ma trận có $\\det(A) = -5 \\neq 0 \\implies$ Độc lập tuyến tính. (b) 4 vectơ trong $\\mathbb{R}^3$ ($4 > 3$) $\\implies$ Phụ thuộc tuyến tính. (c) Hai cột không tỉ lệ, $\\text{rank}=2 \\implies$ Độc lập tuyến tính. (d) $v_2 = 2v_1 \\implies$ Phụ thuộc tuyến tính.",
    answerKey: "(a) Độc lập, (b) Phụ thuộc, (c) Độc lập, (d) Phụ thuộc",
    hints: ["Check determinant for square matrices", "Compare number of vectors with dimension", "Check scalar multiples"],
    detailedHint: "Dùng định thức nếu số vectơ bằng số chiều; số vectơ lớn hơn số chiều luôn phụ thuộc; xét tỷ lệ hoặc hạng của ma trận."
  },
  {
    id: 19,
    title: "Câu 19 — Tính det(4A) biết det(A)",
    topic: "Determinant scalar property det(kA) = k^n det(A)",
    part: "Phần II (11-20)",
    statement: "Cho $A$ là ma trận vuông cấp 4 và $\\det(A) = 3$. Tính $\\det(4A).$",
    solution: "Với ma trận vuông cấp $n$: $\\det(kA) = k^n \\det(A)$. Ở đây $n = 4, k = 4, \\det(A) = 3 \\implies \\det(4A) = 4^4 \\cdot 3 = 256 \\cdot 3 = 768$.",
    answerKey: "768",
    hints: ["Formula det(kA) = k^n det(A)", "Here n = 4, k = 4"],
    detailedHint: "Áp dụng tính chất det(kA) = k^n det(A) với n là cấp của ma trận."
  },
  {
    id: 20,
    title: "Câu 20 — Tìm giá trị của tham số để hệ phương trình tuyến tính có nghiệm",
    topic: "Linear system consistency with parameter",
    part: "Phần II (11-20)",
    statement: "Tìm các giá trị của tham số $a$ để hệ phương trình $\\begin{cases} x + y + z = 1 \\\\ 2x + 2y + 2z = 2 \\\\ x + y + az = 2 \\end{cases}$ có nghiệm.",
    solution: "PT 2 là 2 lần PT 1. PT 3 trừ PT 1: $(a-1)z = 1$. Nếu $a = 1 \\implies 0z = 1$ (vô nghiệm). Nếu $a \\neq 1 \\implies z = \\frac{1}{a-1}$, hệ có nghiệm. Vậy điều kiện là $a \\neq 1$.",
    answerKey: "a \\neq 1",
    hints: ["Subtract equations to eliminate variables", "Check consistency condition (no 0 = non-zero)"],
    detailedHint: "Khử ẩn bằng cách trừ các phương trình, tìm điều kiện của tham số a để tránh phương trình vô lý dạng 0 = non-zero."
  }
];

const app = express();
app.use(express.json());

// API route to get all questions
app.get('/api/questions', (req, res) => {
  res.json(questionsData);
});

// Robust Local Grader (Offline Fallback Mode)
function gradeLocally(userAnswer: string, questionData: any) {
  const cleanUser = (userAnswer || "").toLowerCase().replace(/\s+/g, '');
  const cleanKey = (questionData.answerKey || "").toLowerCase().replace(/\s+/g, '');
  
  const isMatch = cleanUser.length > 0 && (
    cleanUser.includes(cleanKey) || 
    cleanKey.includes(cleanUser) ||
    (cleanKey.match(/-?\d+(\.\d+)?/g) || []).some((num: string) => cleanUser.includes(num))
  );

  return {
    score: isMatch ? 1 : 0,
    isCorrect: isMatch,
    aiFeedback: isMatch 
      ? "Chấm điểm offline: Đáp số hoặc cách làm của bạn khớp với đáp án chuẩn. Đạt 1 điểm tối đa!" 
      : `Chấm điểm offline: Đáp án bạn nhập chưa khớp với đáp án chuẩn (${questionData.answerKey}). Hãy xem lại lời giải chi tiết bên dưới.`,
    skillsIdentified: [questionData.topic]
  };
}

// API route to grade user answer with Gemini, OpenAI, or Offline fallback
app.post('/api/grade', async (req, res) => {
  try {
    const { questionId, userAnswer, questionData, aiSettings } = req.body;
    
    const provider = aiSettings?.provider || 'gemini';
    const apiKey = aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    if (provider === 'offline' || !apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json(gradeLocally(userAnswer, questionData));
    }

    const prompt = `You are an expert professor of Calculus and Linear Algebra (MAE101) grading student math exam answers.

CRITICAL GRADING RULES (RẤT RỘNG RÃI & LINH HOẠT):
- Chỉ cần sinh viên điền đúng ĐÁP SỐ (final answer) HOẶC các BƯỚC LÀM / CÁCH LẬP LUẬN / PHƯƠNG PHÁP đúng, bạn PHẢI cho điểm tối đa (score: 1, isCorrect: true).
- Không bắt bẻ lỗi ký hiệu nhỏ hay trình bày khác một chút nếu bản chất toán học chính xác.
- Chỉ cho 0 điểm nếu sinh viên bỏ trống hoặc trả lời hoàn toàn sai lệch bản chất.

Question:
${questionData.statement}

Official Solution & Answer Key:
Solution: ${questionData.solution}
Correct Answer Key: ${questionData.answerKey}

Student's Submitted Answer:
${userAnswer || "(No answer provided)"}

Evaluate the student's answer according to the generous rules above. Return a JSON response with the following structure:
{
  "score": 1 or 0,
  "isCorrect": true or false,
  "aiFeedback": "Nhận xét ngắn gọn, khích lệ và xác nhận tính đúng đắn của cách làm hoặc đáp số bằng tiếng Việt.",
  "skillsIdentified": ["List of math skills or concepts"]
}

Return ONLY valid JSON.`;

    if (provider === 'openai') {
      const openAiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert math professor grading MAE101 exam answers in JSON format.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
      const openAiData = await openAiResp.json();
      const content = openAiData.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      return res.json({
        score: parsed.score ?? (parsed.isCorrect ? 1 : 0),
        isCorrect: parsed.isCorrect ?? (parsed.score === 1),
        aiFeedback: parsed.aiFeedback || "Chấm điểm hoàn tất.",
        skillsIdentified: parsed.skillsIdentified || [questionData.topic]
      });
    } else {
      const customAi = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const response = await customAi.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const textResult = response.text || "{}";
      let parsed;
      try {
        parsed = JSON.parse(textResult);
      } catch (e) {
        const cleaned = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }
      return res.json({
        score: parsed.score ?? (parsed.isCorrect ? 1 : 0),
        isCorrect: parsed.isCorrect ?? (parsed.score === 1),
        aiFeedback: parsed.aiFeedback || "Chấm điểm hoàn tất.",
        skillsIdentified: parsed.skillsIdentified || [questionData.topic]
      });
    }

  } catch (error: any) {
    console.warn("AI grading error or offline, falling back to local grading:", error.message);
    return res.json(gradeLocally(req.body.userAnswer, req.body.questionData));
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
