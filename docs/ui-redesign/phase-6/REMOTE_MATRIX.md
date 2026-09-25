# TV remote key matrix

The keys the app claims, and what each has to do on both platforms. Apple TV
and Android TV do not deliver the same set: Apple has no dedicated Back key and
reports the Menu button, Android has a hardware Back and no Menu. Anything the
app reads through the remote event stream is listed here, because a handler
that fires on the wrong platform is invisible until someone presses the key.

| Key                | Apple TV      | Android TV     | Expected result                                                             |
| ------------------ | ------------- | -------------- | --------------------------------------------------------------------------- |
| Up/Down/Left/Right | D-pad / swipe | D-pad          | Moves focus. In the player it shows the controls and restarts their timeout |
| Select             | click         | center / Enter | Activates the focused element                                               |
| Long Select        | hold click    | hold center    | Opens the card menu of the focused card; in the player toggles the end card |
| Back               | —             | Back           | Leaves the screen; closes the rail first when the rail is expanded          |
| Menu               | Menu          | —              | Same as Back. Enabled on the video screen, disabled on Home                 |
| Play/Pause         | Play/Pause    | Play/Pause     | Toggles playback without showing the controls                               |
| Long Left/Right    | hold D-pad    | hold D-pad     | Scrubs continuously; releasing seeks to the scrub position                  |
| Long Down          | hold down     | hold down      | Toggles the end card on the video screen                                    |

## Checks

| #   | Screen               | Input                  | Expected result                                                             |
| --- | -------------------- | ---------------------- | --------------------------------------------------------------------------- |
| 1   | Home, rail expanded  | Back / Menu            | The rail collapses and the screen stays open                                |
| 2   | Home, rail collapsed | Back / Menu            | On Android the app closes; on Apple TV Menu is disabled and nothing happens |
| 3   | Video, playing       | Back / Menu            | Playback stops and the previous screen returns                              |
| 4   | Video, playing       | Play/Pause             | Playback toggles; the controls do not have to be visible first              |
| 5   | Video, controls up   | Play/Pause ×2          | Playback returns to where it was; the control timeout is not left armed     |
| 6   | Video                | hold Right 3 s         | Scrubbing accelerates after two seconds and seeks once on release           |
| 7   | Video                | hold Left at 0:05      | Scrubbing stops at the start instead of seeking to a negative position      |
| 8   | Video                | hold Select            | The end card opens; holding again closes it                                 |
| 9   | Feed                 | hold Select on a card  | The card menu opens for that card and for no other                          |
| 10  | Feed                 | hold Select, then move | The menu belongs to the card that was focused, not to the one moved to      |
| 11  | Side panel open      | Back / Menu            | The panel closes and the video keeps playing                                |
| 12  | Any screen           | rapid D-pad, 10 s      | No dropped input and no stuck focus; the app does not slow down over time   |

Step 12 is the regression check for the remote listener work: the app keeps one
native subscription for all of them, so the cost of a key press no longer grows
with the number of cards on screen.

Record deviations with device, OS version, and step number.
