//
//  VolumeControl.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 15.10.24.
//

import SwiftUI

struct VolumeControl: View {
  
  @Environment(MusicPlayerManager.self) private var musicManager: MusicPlayerManager
    
  let customVolumeSliderHeight = CGFloat(40)
  
  @State var isCustomWatchVolumeSliderHidden: Bool = true
  fileprivate var controlsTimer: Timer?
  
    var body: some View {
      HStack {
          VStack(spacing: 0){
              ZStack(alignment: .bottom, content: {
                  Rectangle()
                      .fill(.blue).opacity(0.15)
                  Rectangle()
                      .fill(.red)
                      .frame(height: CGFloat(musicManager.volume ?? 0.0) * customVolumeSliderHeight)
              })
              .frame(width: 8, height: customVolumeSliderHeight)
              .cornerRadius(35)
          }
      }
    }
}

#Preview {
  VolumeControl()
    .environment(MusicPlayerManager.shared)
}

extension View {
    /// Hide or show the view based on a boolean value.
    ///
    /// Example for visibility:
    ///
    ///     Text("Label")
    ///         .isHidden(true)
    ///
    /// Example for complete removal:
    ///
    ///     Text("Label")
    ///         .isHidden(true, remove: true)
    ///
    /// - Parameters:
    ///   - hidden: Set to `false` to show the view. Set to `true` to hide the view.
    ///   - remove: Boolean value indicating whether or not to remove the view.
    @ViewBuilder func isHidden(_ hidden: Bool?, remove: Bool = false) -> some View {
        if hidden == true {
            if !remove {
                self.hidden()
            }
        } else {
            self
        }
    }
}
