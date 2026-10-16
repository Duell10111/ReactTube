Pod::Spec.new do |s|
  s.name           = 'SiriMedia'
  s.version        = '1.0.0'
  s.summary        = 'SiriKit media intents bridge for ReactTube'
  s.description    = 'Receives INPlayMediaIntent / INSearchForMediaIntent in the app, starts React Native headless if needed and forwards requests to JavaScript.'
  s.author         = 'Konstantin Späth'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Intents', 'MediaPlayer'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
