Pod::Spec.new do |s|
  s.name           = 'BotGuardWebView'
  s.version        = '1.0.0'
  s.summary        = 'Headless runtime-resolved WKWebView for BotGuard on tvOS'
  s.description    = 'Loads WebKit at runtime on tvOS, where the SDK has no WebKit headers, to run the BotGuard page for PoTokens (plan phase 5).'
  s.author         = 'Konstantin Späth'
  s.homepage       = 'https://docs.expo.dev/modules/'
  # iOS is listed so phone builds can install the pod; the app only uses the
  # module on tvOS (react-native-webview covers iOS).
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
