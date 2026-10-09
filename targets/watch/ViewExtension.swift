//
//  ViewExtension.swift
//  reacttube
//
//  Created by Konstantin Späth on 30.09.24.
//

import SwiftUI

extension View {
    /// Applies the given transform if the given condition evaluates to `true`.
    /// - Parameters:
    ///   - condition: The condition to evaluate.
    ///   - transform: The transform to apply to the source `View`.
    /// - Returns: Either the original `View` or the modified `View` if the condition is `true`.
    @ViewBuilder func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
  
    func border(width: CGFloat, edges: [Edge], color: Color) -> some View {
        overlay(EdgeBorder(width: width, edges: edges).foregroundColor(color))
    }
}

struct EdgeBorder: Shape {
    var width: CGFloat
    var edges: [Edge]

    func path(in rect: CGRect) -> Path {
        edges.map { edge -> Path in
            switch edge {
            case .top: return Path(.init(x: rect.minX, y: rect.minY, width: rect.width, height: width))
            case .bottom: return Path(.init(x: rect.minX, y: rect.maxY - width, width: rect.width, height: width))
            case .leading: return Path(.init(x: rect.minX, y: rect.minY, width: width, height: rect.height))
            case .trailing: return Path(.init(x: rect.maxX - width, y: rect.minY, width: width, height: rect.height))
            }
        }.reduce(into: Path()) { $0.addPath($1) }
    }
}

/// Menu entry with a colored icon badge, similar to the system settings.
struct MenuIconLabel: View {
  var title: String
  var subtitle: LocalizedStringKey? = nil
  var systemImage: String
  var color: Color

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: systemImage)
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(.white)
        .frame(width: 28, height: 28)
        .background(color.gradient, in: Circle())
      VStack(alignment: .leading, spacing: 1) {
        Text(title)
        if let subtitle {
          Text(subtitle)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }
    }
  }
}
