# 🎮 دليل تصدير لعبة بلياردو أسياد العصا (Android & Windows Export Guide)

يقدم هذا الدليل كل ما تحتاجه لتصدير اللعبة وتشغيلها كتطبيق أندرويد بصيغة **APK** وكتطبيق ويندوز **Windows Executable** مع جميع الصلاحيات المطلوبة.

---

## 📱 أولاً: الصلاحيات الممنوحة لتطبيق أندرويد (Android Permissions)

تم إعداد ملف `android/app/src/main/AndroidManifest.xml` وتزويده بجميع الصلاحيات الضرورية لتقديم تجربة بلياردو احترافية:

| الصلاحية (Permission) | الغرض |
|-----------------------|-------|
| `android.permission.INTERNET` | الاتصال بالإنترنت ومزامنة النتائج واللعب المتعدد |
| `android.permission.ACCESS_NETWORK_STATE` | الكشف عن حالة اتصال الشبكة والـ LAN |
| `android.permission.ACCESS_WIFI_STATE` | البحث عن أجهزة اللاعبين على شبكة الواي فاي المحلية |
| `android.permission.CHANGE_WIFI_MULTICAST_STATE` | بث غرفة اللعب الجماعي عبر Wi-Fi / Multicast |
| `android.permission.VIBRATE` | ردود الفعل اللمسية والاهتزاز الواقعي (Haptics) عند ضرب الكرة أو إسقاطها |
| `android.permission.MODIFY_AUDIO_SETTINGS` | تشغيل الأصوات والموسيقى بنقاء واحترافية |
| `android.permission.WAKE_LOCK` | منع انطفاء شاشة الهاتف أثناء التصويب والتفكير في التسديدة |
| `android.permission.WRITE_EXTERNAL_STORAGE` / `READ` | حفظ البيانات والإحصائيات والتقدم محلياً |

---

## 🚀 ثانياً: كيفية التصدير تلقائياً عبر GitHub Actions Workflow

تم إنشاء ملف التدفق التلقائي في:
`/.github/workflows/build-apps.yml`

### خطوات الحصول على التطبيق بضغطة زر:
1. ارفع المشروع إلى مستودعك على **GitHub** (Push to GitHub).
2. افتح المستودع على متصفحك واضغط على تبويب **Actions** في الأعلى.
3. ستجد سير العمل بعنوان: **`Build Android APK & Windows Release`**.
4. اضغط على **Run workflow** (أو سيبدأ تلقائياً عند كل تحديث/Push).
5. بعد انتهاء البناء (يستغرق حوالي دقيقتين)، ستجد قسم **Artifacts** في أسفل الصفحة:
   - **`CueMasters-Android-APK`**: يحتوي على ملف التطبيق جاهزاً للتثبيت المباشر على أي هاتف أو تابلت أندرويد.
   - **`CueMasters-Windows-Executable`**: يحتوي على حزمة الويندوز الجاهزة للتشغيل بملء الشاشة فورا.

---

## 💻 ثالثاً: نسخة الويندوز (Windows Standalone)
حزمة الويندوز تحتوي على:
1. `Launch-Game.bat`: تشغيل فوري بدون أي تثبيت بنقرة واحدة.
2. `Play-Fullscreen.ps1`: تشغيل اللعبة بوضع ملء الشاشة الخالص (Kiosk Mode) كأنها لعبة مثبتة على الكمبيوتر مع دعم الماوس الكامل والفيزياء 60 إطاراً في الثانية.

---

## 🛠️ رابعاً: البناء اليدوي المحلي (Local Manual Build)

### لأندرويد:
```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# ستجد ملف الـ APK في: android/app/build/outputs/apk/debug/app-debug.apk
```

### للويندوز:
```bash
npm install
npm run build
# افتح مجلد dist وشغّل index.html مباشرة، أو شغّل سكريبت الويندوز المرفق.
```
