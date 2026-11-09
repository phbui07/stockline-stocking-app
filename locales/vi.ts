const vi = {
  // Common
  'common.ok': 'OK',
  'common.cancel': 'Hủy',
  'common.save': 'Lưu',
  'common.delete': 'Xóa',
  'common.error': 'Lỗi',
  'common.success': 'Thành công',
  'common.retry': 'Thử lại',
  'common.loading': 'Đang tải...',
  'common.processing': 'Đang xử lý...',
  'common.continue': 'Tiếp tục',
  'common.back': 'Quay lại',
  'common.orContinueWith': 'Hoặc có thể tiếp tục',
  'common.email': 'Email',
  'common.password': 'Mật khẩu',
  'common.invalidEmail': 'Email không hợp lệ',
  'common.passwordTooShort': 'Mật khẩu tối thiểu 6 ký tự',
  'common.passwordMismatch': 'Mật khẩu nhập lại không khớp',
  'common.dataError':
    'Không tải được dữ liệu thị trường. Kéo xuống để thử lại.',
  'common.shares': '{count} cổ phiếu',
  'common.marketOpen': 'Thị trường đang mở',
  'common.marketClosed': 'Thị trường đã đóng',
  'common.updatedAt': 'Cập nhật lúc {time}',
  'common.today': 'hôm nay',
  'common.simulatedNote':
    'Mô phỏng bằng tiền ảo. Chỉ để học tập, không phải lời khuyên đầu tư.',

  // Chart ranges
  'range.1D': '1 ngày',
  'range.1W': '1 tuần',
  'range.1M': '1 tháng',
  'range.3M': '3 tháng',
  'range.6M': '6 tháng',
  'range.1Y': '1 năm',
  'range.5Y': '5 năm',

  // Onboarding
  'onboarding.skip': 'Bỏ qua',
  'onboarding.slide1Title': 'Biểu đồ giao dịch chứng khoán',
  'onboarding.slide1Desc':
    'Theo dõi giá cổ phiếu trực tiếp và đưa ra quyết định đầu tư sáng suốt hơn.',
  'onboarding.slide2Title': 'Tăng lợi nhuận của bạn',
  'onboarding.slide2Desc':
    'Luyện tập giao dịch với $100.000 tiền ảo, không có rủi ro.',
  'onboarding.login': 'Đăng nhập',
  'onboarding.signup': 'Đăng ký',

  // Login
  'login.title': 'Xin chào',
  'login.subtitle': 'Chào mừng đã quay trở lại, hãy đăng nhập:',
  'login.forgot': 'Quên mật khẩu?',
  'login.noAccount': 'Chưa có tài khoản?',
  'login.signUp': 'Đăng ký',
  'login.wrongCredentials': 'Email hoặc mật khẩu không đúng',
  'login.googleFailed': 'Đăng nhập Google thất bại',
  'login.googleUnavailable':
    'Đăng nhập Google chưa được cấu hình trên thiết bị này.',

  'login.guest': 'Tiếp tục với tư cách khách',

  // Sign up
  'signup.title': 'Tham gia Stockline',
  'signup.subtitle': 'Bắt đầu hành trình đầu tư với $100.000 tiền ảo',
  'signup.name': 'Tên của bạn',
  'signup.nameRequired': 'Hãy nhập tên của bạn',
  'signup.emailExists': 'Email đã tồn tại',
  'signup.success': 'Đăng ký thành công',
  'signup.successMessage': 'Bây giờ bạn có thể đăng nhập.',
  'signup.haveAccount': 'Bạn đã có tài khoản?',
  'signup.login': 'Đăng nhập',

  // Welcome
  'welcome.hello': 'Xin chào {name}!',
  'welcome.title': 'Chào mừng tới Stockline',
  'welcome.subtitle': 'Bạn có {amount} tiền ảo để bắt đầu luyện tập giao dịch',
  'welcome.start': 'Bắt đầu',
  'welcome.friend': 'bạn',

  // Forgot / reset password
  'forgot.title': 'Quên mật khẩu',
  'forgot.desc':
    'Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác minh tới thiết bị này.',
  'forgot.send': 'Gửi mã xác nhận',
  'forgot.notFound': 'Không tìm thấy tài khoản với email này.',
  'forgot.googleAccount':
    'Tài khoản này đăng nhập bằng Google nên không có mật khẩu.',
  'reset.title': 'Đặt mật khẩu mới',
  'reset.desc': 'Tạo mật khẩu mới cho {email}',
  'reset.newPassword': 'Mật khẩu mới',
  'reset.confirmPassword': 'Nhập lại mật khẩu',
  'reset.submit': 'Đổi mật khẩu',
  'reset.success': 'Đã đổi mật khẩu. Hãy đăng nhập lại.',

  // OTP
  'otp.title': 'Nhập mã xác minh',
  'otp.desc':
    'Chúng tôi đã gửi mã gồm 5 chữ số qua thông báo trên thiết bị này.',
  'otp.resend': 'Gửi lại',
  'otp.verify': 'Xác minh',
  'otp.notificationTitle': 'Mã xác minh Stockline',
  'otp.notificationBody':
    'Mã xác minh của bạn là {code}. Mã hết hạn sau 5 phút.',
  'otp.invalidTitle': 'Mã OTP lỗi',
  'otp.invalid': 'Sai mã OTP, vui lòng nhập lại',
  'otp.expired': 'Mã đã hết hạn, hãy gửi lại mã mới',
  'otp.fallbackTitle': 'Mã xác minh',
  'otp.fallbackBody':
    'Thông báo đang bị tắt nên mã được hiển thị tại đây: {code}',

  // Phone
  'phone.title': 'Nhập số điện thoại',
  'phone.desc': 'Bạn sẽ nhận được mã gồm 5 chữ số để xác minh số điện thoại',
  'phone.send': 'Gửi mã',
  'phone.invalidTitle': 'Số điện thoại không phù hợp',
  'phone.invalidDesc': 'Hãy nhập lại số điện thoại',
  'phone.verified': 'Đã xác minh số điện thoại',

  // Home
  'home.portfolioTotal': 'Tổng danh mục đầu tư',
  'home.watchlist': 'Theo dõi',
  'home.watchlistEmpty': 'Nhấn + để thêm cổ phiếu vào danh sách theo dõi',
  'home.popular': 'Cổ phiếu phổ biến',

  // Portfolio (Chart tab)
  'portfolio.title': 'Danh mục đầu tư',
  'portfolio.allTime': 'từ khi bắt đầu',
  'portfolio.gain': 'Lãi',
  'portfolio.loss': 'Lỗ',
  'portfolio.noTrades': 'Hãy mua cổ phiếu đầu tiên để xem hiệu suất danh mục.',
  'portfolio.holdings': 'Cổ phiếu',
  'portfolio.cash': 'Tiền mặt',
  'portfolio.findStocks': 'Tìm cổ phiếu',

  // Trade tab
  'trade.title': 'Giao dịch',
  'trade.buy': 'Mua',
  'trade.sell': 'Bán',
  'trade.overview': 'Tổng quan',
  'trade.history': 'Lịch sử',
  'trade.stats': 'Thống kê giao dịch',
  'trade.totalTrades': 'Tổng GD',
  'trade.winRate': 'Tỷ lệ thắng',
  'trade.realizedPnL': 'Lãi/Lỗ đã chốt',
  'trade.pnlChart': 'Lãi/lỗ đã chốt (7 ngày)',
  'trade.quickActions': 'Thao tác nhanh',
  'trade.cash': 'Tiền mặt',
  'trade.watchlist': 'Danh sách theo dõi',
  'trade.watchlistCount': '{count} cổ phiếu',
  'trade.alerts': 'Cảnh báo giá',
  'trade.alertsCount': '{count} đang bật',
  'trade.historyTitle': 'Lịch sử giao dịch ({count})',
  'trade.noHistory': 'Chưa có giao dịch nào',
  'trade.noHoldingsToSell': 'Bạn chưa sở hữu cổ phiếu nào để bán.',
  'trade.quantity': 'Số lượng:',
  'trade.price': 'Giá:',
  'trade.total': 'Tổng:',
  'trade.pnl': 'Lãi/Lỗ:',
  'trade.completed': 'Hoàn thành',
  'trade.typeBuy': 'MUA',
  'trade.typeSell': 'BÁN',

  // Holdings (Stock tab)
  'holdings.title': 'Danh mục sở hữu',
  'holdings.totalValue': 'Tổng giá trị cổ phiếu',
  'holdings.cashAvailable': 'Tiền mặt khả dụng: {amount}',
  'holdings.search': 'Tìm trong danh mục...',
  'holdings.all': 'Tất cả',
  'holdings.gainers': 'Tăng',
  'holdings.losers': 'Giảm',
  'holdings.count': 'Cổ phiếu sở hữu ({count})',
  'holdings.avgCost': 'Giá vốn {price}',
  'holdings.empty': 'Bạn chưa sở hữu cổ phiếu nào',
  'holdings.emptyDesc': 'Tìm một cổ phiếu và mua bằng tiền ảo để bắt đầu.',

  // Watchlist
  'watchlist.title': 'Danh sách theo dõi',
  'watchlist.sort': 'Sắp xếp: {by}',
  'watchlist.sortDefault': 'Mặc định',
  'watchlist.sortName': 'Tên',
  'watchlist.sortChange': 'Thay đổi',
  'watchlist.sortPrice': 'Giá',
  'watchlist.search': 'Tìm kiếm cổ phiếu...',
  'watchlist.count': 'Tổng cổ phiếu',
  'watchlist.upDown': 'Tăng / Giảm',
  'watchlist.avgChange': 'Thay đổi TB',
  'watchlist.following': 'Đang theo dõi ({count})',
  'watchlist.empty': 'Chưa có cổ phiếu nào trong danh sách theo dõi',
  'watchlist.emptyDesc': 'Tìm kiếm cổ phiếu ở trên để bắt đầu theo dõi',
  'watchlist.results': 'Kết quả tìm kiếm',

  // Search
  'search.titleView': 'Tìm cổ phiếu',
  'search.titleBuy': 'Chọn cổ phiếu để mua',
  'search.titleSell': 'Chọn cổ phiếu để bán',
  'search.titleAlert': 'Chọn cổ phiếu để đặt cảnh báo',
  'search.placeholder': 'Nhập mã hoặc tên công ty...',
  'search.noResults': 'Không tìm thấy kết quả cho "{query}"',
  'search.searching': 'Đang tìm...',
  'search.failed': 'Tìm kiếm thất bại. Kiểm tra kết nối mạng.',

  // Stock details
  'detail.title': 'Thông tin cổ phiếu',
  'detail.about': 'Giới thiệu',
  'detail.details': 'Chi tiết',
  'detail.news': 'Tin tức',
  'detail.website': 'TRANG WEB:',
  'detail.since': 'TỪ NĂM:',
  'detail.employees': 'NHÂN VIÊN:',
  'detail.headquarters': 'TRỤ SỞ CHÍNH:',
  'detail.sector': 'NGÀNH:',
  'detail.leader': 'LÃNH ĐẠO:',
  'detail.exchange': 'SÀN:',
  'detail.noProfile': 'Không có thông tin công ty cho mã này.',
  'detail.profileError': 'Không tải được thông tin công ty.',
  'detail.keyStats': 'Chỉ số chính',
  'detail.open': 'Mở cửa',
  'detail.prevClose': 'Đóng cửa trước',
  'detail.dayRange': 'Biên độ ngày',
  'detail.yearRange': 'Biên độ 52 tuần',
  'detail.volume': 'Khối lượng',
  'detail.avgVolume': 'KL trung bình',
  'detail.marketCap': 'Vốn hóa',
  'detail.pe': 'P/E',
  'detail.dividendYield': 'Tỷ suất cổ tức',
  'detail.financials': 'Kết quả kinh doanh',
  'detail.year': 'Năm',
  'detail.revenue': 'Doanh thu',
  'detail.netIncome': 'Thu nhập ròng',
  'detail.noNews': 'Chưa có tin tức',
  'detail.position': 'Vị thế của bạn',
  'detail.positionShares': 'Số cổ phiếu',
  'detail.positionAvg': 'Giá vốn TB',
  'detail.positionValue': 'Giá trị',
  'detail.positionPnl': 'Lãi/Lỗ',
  'detail.notTradable':
    'Mã này không giao dịch được trong ứng dụng (chỉ hỗ trợ cổ phiếu và quỹ ETF niêm yết bằng USD).',
  'detail.watch': 'Theo dõi',
  'detail.unwatch': 'Bỏ theo dõi',
  'detail.setAlert': 'Đặt cảnh báo giá',
  'detail.chartError': 'Không tải được biểu đồ',

  // Order
  'order.title': 'Xác nhận lệnh',
  'order.marketPrice': 'Giá thị trường',
  'order.quantity': 'Số lượng',
  'order.max': 'Tối đa',
  'order.estimatedTotal': 'Tổng giá trị ước tính',
  'order.cashAvailable': 'Tiền mặt khả dụng',
  'order.sharesOwned': 'Cổ phiếu đang có',
  'order.cashAfter': 'Tiền mặt sau giao dịch',
  'order.fundingSource': 'Nguồn tiền',
  'order.virtualAccount': 'Tài khoản ảo',
  'order.place': 'Đặt lệnh',
  'order.disclaimer': 'Lệnh được khớp ngay tại giá gần nhất.',
  'order.insufficientCash': 'Không đủ tiền mặt cho lệnh này.',
  'order.insufficientShares': 'Bạn không có đủ cổ phiếu để bán.',
  'order.invalidQuantity': 'Số lượng phải lớn hơn 0.',
  'order.priceUnavailable': 'Chưa có giá thị trường, vui lòng thử lại.',
  'order.confirmTitle': 'Xác nhận lệnh {side}',
  'order.confirmMessage':
    '{side} {shares} cổ phiếu {symbol} với giá {price}?\nTổng: {total}',
  'order.successBuy': 'Đã mua {shares} cổ phiếu {symbol} với giá {price}.',
  'order.successSell': 'Đã bán {shares} cổ phiếu {symbol} với giá {price}.',
  'order.authPrompt': 'Xác thực để {side} {symbol}',
  'order.authFailed': 'Xác thực không thành công. Lệnh chưa được đặt.',

  // Growth rankings
  'home.movers': 'Xếp hạng tăng trưởng',
  'home.moversDesc': 'Cổ phiếu tăng mạnh nhất theo ngày, tuần, tháng, năm',
  'movers.title': 'Xếp hạng tăng trưởng',
  'movers.gainers': 'Tăng mạnh nhất',
  'movers.losers': 'Giảm mạnh nhất',
  'movers.day': 'Ngày',
  'movers.week': 'Tuần',
  'movers.month': 'Tháng',
  'movers.year': 'Năm',
  'movers.periodDay': 'phiên gần nhất',
  'movers.periodWeek': '1 tuần qua',
  'movers.periodMonth': '1 tháng qua',
  'movers.periodYear': '1 năm qua',
  'movers.intro':
    'Xếp hạng {count} công ty lớn của Mỹ theo mức thay đổi giá trong {period}.',
  'movers.caveat':
    'Mức tăng trong quá khứ không có nghĩa là giá sẽ tiếp tục tăng, và những mã biến động mạnh nhất thường cũng rủi ro nhất. Đây là bảng xếp hạng dữ liệu, không phải khuyến nghị.',

  // Learn: AI explainer and indicator history
  'detail.learnMore': 'Tìm hiểu cổ phiếu này',
  'detail.learnMoreDesc': 'AI giải thích và lịch sử các chỉ báo',
  'insights.title': 'Tìm hiểu {symbol}',
  'insights.aiTitle': 'AI giải thích',
  'insights.aiIntro':
    'AI đọc dữ liệu giá, các con số chính và tin tức gần đây rồi giải thích bằng ngôn ngữ dễ hiểu.',
  'insights.explain': 'Giải thích cổ phiếu này',
  'insights.regenerate': 'Tạo lại',
  'insights.loading': 'AI đang đọc dữ liệu...',
  'insights.summary': 'Tổng quan',
  'insights.priceAction': 'Diễn biến giá',
  'insights.valuation': 'Các con số chính',
  'insights.news': 'Tin tức gần đây',
  'insights.positives': 'Điểm tích cực',
  'insights.risks': 'Rủi ro cần lưu ý',
  'insights.questions': 'Câu hỏi để bạn tự tìm hiểu',
  'insights.terms': 'Thuật ngữ',
  'insights.label':
    'Nội dung do AI ({model}) tạo lúc {time}, chỉ nhằm mục đích giáo dục; không phải tư vấn đầu tư chứng khoán. AI có thể sai, hãy kiểm tra lại.',
  'insights.removed': 'Đã ẩn {count} câu mang tính khuyến nghị.',
  'insights.noticeTitle': 'Giải thích bằng AI',
  'insights.noticeBody':
    'Phần giải thích do AI (Google Gemini) tạo, chỉ nhằm mục đích giáo dục, không phải tư vấn đầu tư. AI có thể sai.\n\nChỉ dữ liệu công khai về cổ phiếu được gửi tới Google; tài khoản và danh mục của bạn không được gửi đi. Ở gói miễn phí, Google có thể dùng dữ liệu này để cải thiện sản phẩm.',
  'insights.noticeContinue': 'Tiếp tục',
  'insights.needKey':
    'AI cần một khóa API Gemini miễn phí. Tạo khóa tại Google AI Studio rồi dán vào đây.',
  'insights.getKey': 'Lấy khóa miễn phí',
  'insights.keyPlaceholder': 'Dán khóa API',
  'insights.saveKey': 'Lưu khóa',
  'insights.checkingKey': 'Đang kiểm tra khóa...',
  'insights.errorInvalidKey': 'Khóa API không hợp lệ. Hãy kiểm tra lại.',
  'insights.errorQuota': 'Đã hết lượt miễn phí hôm nay. Hãy thử lại sau.',
  'insights.errorBlocked': 'AI từ chối trả lời yêu cầu này.',
  'insights.errorNetwork':
    'Không kết nối được với AI. Kiểm tra mạng và thử lại.',
  'insights.errorBad': 'AI trả về kết quả không đọc được. Hãy thử lại.',
  'insights.positionTitle': 'Trong danh mục ảo của bạn',
  'insights.positionDesc':
    'Bạn có {shares} cổ phiếu, chiếm {percent} tổng giá trị danh mục. Thông tin này chỉ được tính trên máy và không gửi cho AI.',
  'insights.indicatorsTitle': 'Chỉ báo kỹ thuật và lịch sử',
  'insights.indicatorsIntro':
    'Từ {from} đến {to}, vào những ngày tình huống này xảy ra, giá {horizon} phiên sau (khoảng 1 tháng) cao hơn bao nhiêu phần trăm số lần? Hãy so với mức cơ sở của mọi ngày.',
  'insights.baseRate': 'Mọi ngày (mức cơ sở)',
  'insights.higherAfter': 'Cao hơn {rate} số lần · TB {avg} · {count} ngày',
  'insights.fewSamples': 'ít trường hợp, khó rút ra kết luận',
  'insights.never': 'Không xảy ra trong giai đoạn này',
  'insights.now': 'Hiện tại: đúng',
  'insights.notNow': 'Hiện tại: không',
  'insights.caveat':
    'Kết quả mang tính giả định, dựa trên dữ liệu quá khứ của chính mã này, và các giai đoạn chồng lấn nhau nên không độc lập. Không phản ánh kết quả đầu tư thực tế và không đảm bảo kết quả trong tương lai.',
  'insights.notEnoughData': 'Chưa đủ dữ liệu lịch sử để tính.',
  'indicator.aboveSma200': 'Giá trên đường trung bình 200 ngày',
  'indicator.aboveSma200Desc':
    'Đường trung bình 200 ngày là giá đóng cửa trung bình của khoảng 10 tháng giao dịch, thường dùng để xem xu hướng dài hạn.',
  'indicator.smaCross': 'Trung bình 50 ngày trên trung bình 200 ngày',
  'indicator.smaCrossDesc':
    'Khi đường ngắn hạn nằm trên đường dài hạn, giá gần đây cao hơn mức trung bình dài hạn. Lúc đường ngắn hạn cắt lên được gọi là "giao cắt vàng".',
  'indicator.rsiBelow30': 'RSI dưới 30 ("quá bán")',
  'indicator.rsiBelow30Desc':
    'RSI (0–100) so sánh mức tăng và mức giảm trong 14 phiên. Dưới 30 nghĩa là giá vừa giảm nhanh.',
  'indicator.rsiAbove70': 'RSI trên 70 ("quá mua")',
  'indicator.rsiAbove70Desc':
    'RSI trên 70 nghĩa là giá vừa tăng nhanh trong thời gian ngắn.',
  'indicator.drawdown10': 'Thấp hơn đỉnh 1 năm trên 10%',
  'indicator.drawdown10Desc':
    'Giá hiện tại thấp hơn mức đóng cửa cao nhất của 252 phiên gần nhất hơn 10%.',
  'settings.ai': 'AI giải thích',
  'settings.aiDesc':
    'Dùng khóa API Gemini miễn phí của bạn. Khóa chỉ được lưu trên thiết bị này.',
  'settings.aiKeySet': 'Đã có khóa',
  'settings.aiRemoveKey': 'Xóa khóa',
  'settings.aiKeySaved': 'Đã lưu khóa API',

  // Biometrics
  'bio.notAvailable': 'Thiết bị không hỗ trợ xác thực sinh trắc học',
  'bio.failed': 'Xác thực không thành công',
  'bio.error': 'Lỗi xác thực sinh trắc học',
  'bio.defaultReason': 'Xác thực để tiếp tục',

  // Price alerts
  'alerts.title': 'Cảnh báo giá',
  'alerts.add': 'Thêm cảnh báo',
  'alerts.currentPrice': 'Giá hiện tại: {price}',
  'alerts.targetPlaceholder': 'Giá mục tiêu',
  'alerts.above': 'Báo khi giá tăng lên {price}',
  'alerts.below': 'Báo khi giá giảm xuống {price}',
  'alerts.create': 'Tạo cảnh báo',
  'alerts.active': 'Đang bật ({count})',
  'alerts.triggered': 'Đã kích hoạt ({count})',
  'alerts.empty': 'Chưa có cảnh báo nào',
  'alerts.emptyDesc':
    'Đặt giá mục tiêu và nhận thông báo khi giá chạm mức đó (khi ứng dụng đang mở).',
  'alerts.triggeredAt': 'Kích hoạt lúc {time}',
  'alerts.notifTitle': '{symbol} đã chạm {price}',
  'alerts.notifBodyAbove': '{name} đã tăng lên {price} (mục tiêu {target}).',
  'alerts.notifBodyBelow': '{name} đã giảm xuống {price} (mục tiêu {target}).',
  'alerts.invalidTarget': 'Hãy nhập giá mục tiêu hợp lệ, khác giá hiện tại.',
  'alerts.permissionDenied':
    'Thông báo đang tắt. Bật thông báo trong Cài đặt để nhận cảnh báo.',
  'alerts.created': 'Đã tạo cảnh báo',
  'alerts.rearm': 'Bật lại',

  // Profile
  'profile.title': 'Tài khoản',
  'profile.virtualBalance': 'Tài khoản ảo',
  'profile.invite': 'Mời bạn bè',
  'profile.inviteDesc': 'Chia sẻ Stockline để cùng luyện tập đầu tư',
  'profile.inviteMessage':
    'Mình đang luyện tập đầu tư chứng khoán với Stockline: tiền ảo, giá thị trường thật. Thử cùng mình nhé!',
  'profile.account': 'Tài khoản',
  'profile.security': 'Bảo mật',
  'profile.transactions': 'Hóa đơn/Giao dịch',
  'profile.language': 'Ngôn ngữ',
  'profile.settings': 'Cài đặt',
  'profile.faq': 'Câu hỏi thường gặp',
  'profile.logout': 'Đăng xuất',
  'profile.logoutConfirm': 'Bạn có chắc muốn đăng xuất?',

  // Guest mode
  'guest.name': 'Khách',
  'guest.subtitle': 'Dữ liệu chỉ được lưu trên thiết bị này',
  'guest.exit': 'Thoát chế độ khách',
  'guest.exitConfirm':
    'Danh mục của khách vẫn được lưu trên thiết bị này. Chọn "Tiếp tục với tư cách khách" để quay lại.',

  // Account details
  'account.title': 'Thông tin tài khoản',
  'account.name': 'Tên hiển thị',
  'account.phone': 'Số điện thoại',
  'account.addPhone': 'Thêm số điện thoại',
  'account.changePhone': 'Đổi',
  'account.saveName': 'Lưu tên',
  'account.nameSaved': 'Đã lưu tên hiển thị',
  'account.nameRequired': 'Tên không được để trống',
  'account.changePassword': 'Đổi mật khẩu',
  'account.currentPassword': 'Mật khẩu hiện tại',
  'account.wrongPassword': 'Mật khẩu hiện tại không đúng',
  'account.passwordChanged': 'Đã đổi mật khẩu',
  'account.googleAccount':
    'Bạn đăng nhập bằng Google nên không có mật khẩu để đổi.',

  // Security
  'security.title': 'Bảo mật',
  'security.biometricTrades': 'Xác thực sinh trắc học khi giao dịch',
  'security.biometricDesc': 'Yêu cầu {type} trước khi đặt lệnh mua hoặc bán.',
  'security.notAvailable':
    'Thiết bị này chưa cài đặt Face ID hoặc vân tay. Lệnh sẽ được xác nhận bằng hộp thoại.',
  'security.faceId': 'Face ID',
  'security.touchId': 'Touch ID',
  'security.fingerprint': 'vân tay',
  'security.enablePrompt': 'Xác thực để bật tính năng này',

  // Language
  'language.title': 'Ngôn ngữ',

  // Settings
  'settings.title': 'Cài đặt',
  'settings.notifications': 'Thông báo',
  'settings.notificationsDesc': 'Dùng cho mã xác minh và cảnh báo giá.',
  'settings.notificationsOn': 'Đã bật',
  'settings.enableNotifications': 'Bật thông báo',
  'settings.virtualAccount': 'Tài khoản ảo',
  'settings.startingBalance': 'Số dư ban đầu',
  'settings.reset': 'Đặt lại tài khoản ảo',
  'settings.resetDesc':
    'Xóa toàn bộ cổ phiếu và lịch sử giao dịch, đặt lại số dư về {amount}.',
  'settings.resetConfirm':
    'Bạn có chắc muốn đặt lại? Thao tác này không thể hoàn tác.',
  'settings.resetDone': 'Đã đặt lại tài khoản ảo',
  'settings.dataSource': 'Nguồn dữ liệu',
  'settings.dataSourceDesc':
    'Giá lấy từ Yahoo Finance, có thể chậm vài phút và tự cập nhật mỗi 20 giây khi ứng dụng đang mở.',

  // FAQ
  'faq.title': 'Câu hỏi thường gặp',
  'faq.q1': 'Stockline có dùng tiền thật không?',
  'faq.a1':
    'Không. Mọi giao dịch đều dùng tiền ảo. Bạn bắt đầu với $100.000 và có thể đặt lại bất cứ lúc nào trong Cài đặt.',
  'faq.q2': 'Giá cổ phiếu lấy từ đâu?',
  'faq.a2':
    'Giá lấy từ Yahoo Finance và tự cập nhật mỗi 20 giây khi ứng dụng mở. Dữ liệu có thể chậm vài phút so với sàn.',
  'faq.q3': 'Lệnh được khớp như thế nào?',
  'faq.a3':
    'Lệnh mua và bán được khớp ngay tại giá gần nhất, kể cả khi thị trường đóng cửa. Không tính phí giao dịch.',
  'faq.q4': 'Lãi/lỗ được tính ra sao?',
  'faq.a4':
    'Lãi/lỗ chưa chốt = (giá hiện tại − giá vốn trung bình) × số cổ phiếu. Lãi/lỗ đã chốt được ghi lại mỗi khi bạn bán.',
  'faq.q5': 'Cảnh báo giá hoạt động thế nào?',
  'faq.a5':
    'Đặt giá mục tiêu cho một cổ phiếu. Khi giá chạm mức đó, bạn nhận được thông báo. Cảnh báo chỉ được kiểm tra khi ứng dụng đang mở.',
  'faq.q6': 'Dữ liệu của tôi được lưu ở đâu?',
  'faq.a6':
    'Tài khoản, danh mục và lịch sử giao dịch được lưu ngay trên thiết bị này. Gỡ ứng dụng sẽ xóa toàn bộ dữ liệu.',
  // Automate
  'home.automate': 'Tự động hóa',
  'home.automateDesc': 'Đầu tư định kỳ và thử nghiệm chiến lược bằng tiền ảo',
  'automate.title': 'Tự động hóa',
  'automate.intro':
    'Các tự động hóa giao dịch theo giá đóng cửa mỗi ngày. Chúng chạy khi ứng dụng đang mở và bù lại những ngày bạn đã bỏ lỡ.',
  'automate.checking': 'Đang kiểm tra giá…',
  'automate.lastRun': 'Kiểm tra lần cuối {time}. Giá đến hết ngày {date}.',
  'automate.neverRun': 'Giá được kiểm tra mỗi khi bạn mở ứng dụng.',
  'automate.failed': 'Không tải được giá của {symbols}. Sẽ thử lại lần sau.',
  'automate.runNow': 'Kiểm tra ngay',

  // Recurring investments
  'recurring.title': 'Đầu tư định kỳ',
  'recurring.explain':
    'Mua một số tiền cố định theo lịch, bất kể giá. Giá thấp thì mua được nhiều cổ phiếu hơn, giá cao thì ít hơn. Cách này gọi là bình quân giá (DCA).',
  'recurring.add': 'Tạo mới',
  'recurring.empty': 'Chưa có khoản đầu tư định kỳ nào.',
  'recurring.newTitle': 'Đầu tư định kỳ mới',
  'recurring.editTitle': 'Sửa đầu tư định kỳ',
  'recurring.amount': 'Số tiền mỗi lần mua',
  'recurring.amountRange': 'Từ {min} đến {max}',
  'recurring.frequency': 'Tần suất',
  'recurring.weekdayLabel': 'Ngày trong tuần',
  'recurring.dayLabel': 'Ngày trong tháng',
  'recurring.day': 'Ngày {day}',
  'recurring.dayHint': 'Không có ngày 29–31 để tháng nào cũng có ngày này.',
  'recurring.startLabel': 'Ngày bắt đầu (chỉ để thử nghiệm)',
  'recurring.startHint':
    'Dạng YYYY-MM-DD. Ngày trong quá khứ sẽ mua theo giá đóng cửa cũ. Chỉ hiện trong bản phát triển.',
  'recurring.invalidStart': 'Nhập ngày dạng 2026-01-15.',
  'recurring.firstBuy': 'Lần mua tiếp theo: {date}, theo giá đóng cửa ngày đó.',
  'recurring.howItWorks':
    'Mỗi lần mua {amount} {symbol}, kể cả phần lẻ của cổ phiếu. Nếu rơi vào cuối tuần hoặc ngày lễ, lệnh sẽ mua vào phiên giao dịch kế tiếp. Nếu không đủ tiền mặt, lần mua đó sẽ bị bỏ qua.',
  'recurring.next': 'Lần tới: {date}',
  'recurring.active': 'Đang chạy',
  'recurring.paused': 'Tạm dừng',
  'recurring.pause': 'Tạm dừng',
  'recurring.resume': 'Tiếp tục',
  'recurring.pausedNote':
    'Các lần mua bị lỡ trong lúc tạm dừng sẽ được bỏ qua, không mua bù.',
  'recurring.edit': 'Sửa',
  'recurring.deleteTitle': 'Xóa khoản đầu tư định kỳ này?',
  'recurring.deleteMessage':
    'Các cổ phiếu nó đã mua vẫn nằm trong danh mục của bạn.',
  'recurring.purchases': 'Số lần mua',
  'recurring.invested': 'Đã đầu tư',
  'recurring.sharesBought': 'Cổ phiếu đã mua',
  'recurring.avgPrice': 'Giá mua trung bình',
  'recurring.worthToday': 'Giá trị hôm nay',
  'recurring.statsNote':
    'Tính cho các cổ phiếu mà khoản đầu tư này đã mua, theo giá hiện tại.',
  'recurring.history': 'Lịch sử',
  'recurring.noHistory': 'Chưa có lần mua nào. Lần đầu vào {date}.',
  'recurring.bought': 'Đã mua {shares} cổ phiếu giá {price}',
  'recurring.notFound': 'Không tìm thấy khoản đầu tư định kỳ này.',
  'search.titleRecurring': 'Chọn cổ phiếu hoặc ETF',

  'frequency.weekly': 'Hằng tuần',
  'frequency.biweekly': '2 tuần một lần',
  'frequency.monthly': 'Hằng tháng',
  'schedule.weekly': '{weekday} hằng tuần',
  'schedule.biweekly': '{weekday}, 2 tuần một lần',
  'schedule.monthly': 'Ngày {day} hằng tháng',
  'weekday.1': 'Thứ Hai',
  'weekday.2': 'Thứ Ba',
  'weekday.3': 'Thứ Tư',
  'weekday.4': 'Thứ Năm',
  'weekday.5': 'Thứ Sáu',
  'weekdayShort.1': 'T2',
  'weekdayShort.2': 'T3',
  'weekdayShort.3': 'T4',
  'weekdayShort.4': 'T5',
  'weekdayShort.5': 'T6',

  // Why an automated trade happened
  'reason.recurringBuy': 'Mua định kỳ {amount}',
  'reason.recurringSkippedCash':
    'Bỏ qua: cần {amount} nhưng chỉ còn {cash} tiền mặt',
  // Risk rules
  'risk.title': 'Quy tắc rủi ro',
  'risk.stopLoss': 'Cắt lỗ',
  'risk.takeProfit': 'Chốt lời',
  'risk.trailingStop': 'Dừng lỗ động',
  'risk.stopLossExplain':
    'Hạn chế khoản lỗ: bán hết nếu giá giảm một tỷ lệ nhất định dưới giá bạn đã mua.',
  'risk.takeProfitExplain':
    'Chốt khoản lãi: bán hết nếu giá tăng một tỷ lệ nhất định trên giá bạn đã mua.',
  'risk.trailingStopExplain':
    'Giữ lãi khi giá tăng: ngưỡng bán nằm dưới giá đóng cửa cao nhất kể từ khi bạn mua một tỷ lệ nhất định, và chỉ đi lên.',
  'risk.intro':
    'Quy tắc tự động bán toàn bộ vị thế khi giá đóng cửa vượt qua một ngưỡng. Mỗi quy tắc chỉ xét giá đóng cửa sau khi bạn bật nó.',
  'risk.boughtOn': 'Ngày mua',
  'risk.lastClose': 'Giá đóng cửa gần nhất ({date})',
  'risk.highestClose': 'Đóng cửa cao nhất từ khi mua ({date})',
  'risk.notHeld':
    'Bạn không còn nắm giữ {symbol}, nên không có quy tắc nào đang chạy.',
  'risk.on': 'Đang bật',
  'risk.off': 'Tắt',
  'risk.turnOn': 'Bật',
  'risk.update': 'Cập nhật',
  'risk.turnOff': 'Tắt',
  'risk.percentPlaceholder': 'Ví dụ: 8',
  'risk.invalidPercent': 'Nhập tỷ lệ từ {min}% đến {max}%.',
  'risk.lineStopLoss':
    'Bán nếu một phiên đóng cửa ở {line} hoặc thấp hơn, tức {percent}% dưới giá vốn trung bình {reference}.',
  'risk.lineTakeProfit':
    'Bán nếu một phiên đóng cửa ở {line} hoặc cao hơn, tức {percent}% trên giá vốn trung bình {reference}.',
  'risk.lineTrailingStop':
    'Bán nếu một phiên đóng cửa ở {line} hoặc thấp hơn, tức {percent}% dưới giá đóng cửa cao nhất từ khi mua ({reference}). Ngưỡng này đi lên khi giá lập đỉnh mới và không bao giờ đi xuống.',
  'risk.noCloseYet':
    'Chưa có giá đóng cửa nào kể từ khi bạn mua, nên ngưỡng sẽ tính từ phiên đóng cửa đầu tiên.',
  'risk.alreadyPast':
    'Giá đóng cửa gần nhất ({close}) đã vượt ngưỡng này. Nếu phiên tới cũng vậy, lệnh sẽ bán.',
  'risk.nextCheck': 'Lần kiểm tra tới: giá đóng cửa {date}.',
  'risk.gapNote':
    'Quy tắc được kiểm tra mỗi ngày một lần, theo giá đóng cửa. Nếu giá tăng hay giảm mạnh trong một ngày, lệnh bán sẽ khớp ở giá đóng cửa đó và có thể vượt qua ngưỡng của bạn.',
  'risk.history': 'Quy tắc trước đây',
  'risk.triggeredOn': '{rule} {percent}%: đã bán ngày {date}',
  'risk.endedOn':
    '{rule} {percent}%: kết thúc ngày {date} vì vị thế đã được bán',
  'risk.activeCount': '{count} đang bật',
  'risk.hubExplain':
    'Bán tự động bằng cắt lỗ, chốt lời hoặc dừng lỗ động. Thêm quy tắc từ một cổ phiếu bạn đang nắm giữ.',
  'risk.hubEmpty': 'Chưa có quy tắc rủi ro nào đang bật.',
  'risk.soldSummary': 'Đã bán {symbol}: {rule} {percent}% ngày {date}',
  'reason.stopLoss':
    'Đã bán: chạm cắt lỗ (−{percent}%). Đóng cửa ở {close}, {move} so với giá vốn trung bình {reference}.',
  'reason.takeProfit':
    'Đã bán: chạm chốt lời (+{percent}%). Đóng cửa ở {close}, {move} so với giá vốn trung bình {reference}.',
  'reason.trailingStop':
    'Đã bán: chạm dừng lỗ động (−{percent}%). Đóng cửa ở {close}, {move} so với giá đóng cửa cao nhất {reference}.',
  // Strategy bots
  'bot.title': 'Bot chiến lược',
  'bot.hubExplain':
    'Bot làm theo một quy tắc giao dịch trên một cổ phiếu. Hãy thiết lập và xem các tín hiệu của nó trong năm qua. Bot chưa giao dịch: bước tiếp theo là thử nó trên giá quá khứ.',
  'bot.empty': 'Chưa có bot nào.',
  'bot.newTitle': 'Bot chiến lược mới',
  'bot.editTitle': 'Sửa bot chiến lược',
  'bot.strategy': 'Giao cắt đường trung bình động',
  'bot.maExplain':
    'Giữ cổ phiếu khi xu hướng đi lên. Đường "nhanh" là giá hoặc một đường trung bình ngắn; đường "chậm" là đường trung bình dài hơn. Bot mua khi đường nhanh nằm trên đường chậm và bán khi nó rơi xuống dưới.',
  'bot.modeCross': 'Hai đường trung bình',
  'bot.modePrice': 'Giá so với trung bình',
  'bot.fastLength': 'Trung bình ngắn (ngày)',
  'bot.slowLength': 'Trung bình dài (ngày)',
  'bot.priceLength': 'Trung bình (ngày)',
  'bot.buffer': 'Vùng đệm',
  'bot.bufferHint':
    'Chỉ hành động khi đường nhanh vượt đường chậm một khoảng như vậy. Ít tín hiệu sai hơn nhưng chậm hơn.',
  'bot.bufferPercent': 'Vùng đệm %',
  'bot.trendFilter': 'Bộ lọc xu hướng',
  'bot.trendHint':
    'Chỉ mua khi giá nằm trên một đường trung bình dài hạn. Không bao giờ buộc phải bán.',
  'bot.trendLength': 'Trung bình dài hạn (ngày)',
  'bot.exits': 'Điểm thoát',
  'bot.exitsExplain':
    'Không bắt buộc: các quy tắc này cũng bán, ngoài tín hiệu bán của chiến lược. Để trống là tắt.',
  'bot.off': 'Tắt',
  'bot.sizing': 'Quy mô vị thế',
  'bot.riskPercent': 'Rủi ro mỗi lệnh (% tài khoản)',
  'bot.sizingExample':
    'Với tài khoản {account}, mỗi lần mua đầu tư tối đa {invest}.',
  'bot.sizingStop': 'Nếu chạm mức dừng {stop}%, khoản lỗ khoảng {loss}.',
  'bot.sizingNoStop':
    'Nếu không có cắt lỗ hay dừng lỗ động, tỷ lệ rủi ro là mức tối đa được đầu tư.',
  'bot.errorFast':
    'Trung bình ngắn cần từ 2 đến 400 ngày và phải ngắn hơn trung bình dài.',
  'bot.errorSlow': 'Đường trung bình cần từ 2 đến 400 ngày.',
  'bot.errorBuffer': 'Vùng đệm từ 0% đến 20%.',
  'bot.errorTrend': 'Trung bình dài hạn cần từ 2 đến 400 ngày.',
  'bot.errorExit':
    'Cắt lỗ và dừng lỗ động từ 0,5% đến 90%; chốt lời từ 0,5% đến 1000%.',
  'bot.errorRisk': 'Rủi ro mỗi lệnh từ 0,1% đến 100%.',
  'bot.preview': 'Tín hiệu trong năm qua',
  'bot.signalCount': 'Tín hiệu mua: {buys}. Tín hiệu bán: {sells}.',
  'bot.previewNote':
    'Biểu đồ chỉ cho thấy nơi quy tắc sẽ mua và bán, theo giá đóng cửa. Tiền, quy mô vị thế và điểm thoát sẽ có trong phần kiểm thử quá khứ.',
  'bot.lastSignal': 'Tín hiệu gần nhất ({date}): {reason}',
  'bot.notLive':
    'Bot chưa giao dịch. Bạn sẽ có thể thử nó trên giá quá khứ, rồi chạy bằng tiền ảo.',
  'bot.chartLabel':
    'Biểu đồ giá với các đường trung bình động và tín hiệu mua bán trong quá khứ',
  'bot.legendPrice': 'Giá',
  'bot.legendBuy': 'Tín hiệu mua',
  'bot.legendSell': 'Tín hiệu bán',
  'bot.statePrice':
    'Ngày {date}, giá ({close}) chênh {move} so với trung bình {slow} ngày.',
  'bot.stateCross':
    'Ngày {date}, trung bình {fast} ngày chênh {move} so với trung bình {slow} ngày.',
  'bot.stateTrend': 'Giá chênh {move} so với trung bình {trend} ngày.',
  'bot.deleteTitle': 'Xóa bot này?',
  'bot.deleteMessage': 'Thiết lập của nó sẽ bị xóa.',
  'strategy.priceVsMa': 'Giá so với trung bình {slow} ngày',
  'strategy.maCross': 'Giao cắt trung bình {fast}/{slow} ngày',
  'strategy.withBuffer': 'vùng đệm {buffer}%',
  'strategy.withTrend': 'chỉ mua trên trung bình {trend} ngày',
  'reason.maBuyPrice': 'Đã mua: giá đóng cửa trên trung bình {slow} ngày',
  'reason.maBuyPriceBuffer':
    'Đã mua: giá đóng cửa cao hơn trung bình {slow} ngày hơn {buffer}%',
  'reason.maBuyCross':
    'Đã mua: trung bình {fast} ngày vượt lên trên trung bình {slow} ngày',
  'reason.maBuyCrossBuffer':
    'Đã mua: trung bình {fast} ngày vượt lên trên trung bình {slow} ngày hơn {buffer}%',
  'reason.maSellPrice': 'Đã bán: giá đóng cửa dưới trung bình {slow} ngày',
  'reason.maSellPriceBuffer':
    'Đã bán: giá đóng cửa thấp hơn trung bình {slow} ngày hơn {buffer}%',
  'reason.maSellCross':
    'Đã bán: trung bình {fast} ngày cắt xuống dưới trung bình {slow} ngày',
  'reason.maSellCrossBuffer':
    'Đã bán: trung bình {fast} ngày cắt xuống dưới trung bình {slow} ngày hơn {buffer}%',
  'reason.maTrendBlocked':
    'Không mua: giá đang dưới trung bình {trend} ngày (bộ lọc xu hướng)',
  'reason.maHold': 'Không có tín hiệu',
  'reason.maWarmup': 'Đang chờ đủ {days} ngày giá',
  'reason.maLine': 'Trung bình {days} ngày',
};

export default vi;
