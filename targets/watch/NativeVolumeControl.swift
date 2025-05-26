//
//  NativeVolumeControl.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 13.05.25.
//

import SwiftUI
import WatchKit

struct NativeVolumeControl: WKInterfaceObjectRepresentable {
      func makeWKInterfaceObject(context: Context) -> WKInterfaceVolumeControl {
          return WKInterfaceVolumeControl.init(origin: .local)
      }

      func updateWKInterfaceObject(_ wkInterfaceObject: WKInterfaceVolumeControl, context: Context) {
          // Keine weiteren Updates nötig
      }
}
