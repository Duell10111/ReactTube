Pod::Spec.new do |s|
  s.name           = 'MediaServer'
  s.version        = '1.0.0'
  s.summary        = 'Loopback HTTP server for HLS manifests and SABR segments'
  s.description    = 'Serves generated HLS playlists and on-demand SABR segments to AVPlayer over 127.0.0.1 (plan phase 3).'
  s.author         = 'Konstantin Späth'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
