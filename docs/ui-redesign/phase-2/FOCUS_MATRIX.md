# TV focus and back matrix

Run this matrix on Apple TV and Android TV with the remote only. No step may
use a pointer or touch input.

| #   | Start state                           | Input            | Expected result                                                                           |
| --- | ------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| 1   | Home, focus on the first card         | Left             | Focus enters the rail, the rail expands, and the content plane moves right by exactly 224 |
| 2   | Rail expanded, focus on a destination | Up / Down        | Focus moves within the rail; the rail stays expanded and does not flicker                 |
| 3   | Rail expanded                         | Right            | Focus returns to the content, the rail collapses, and the content plane moves back        |
| 4   | Rail expanded                         | Back             | The rail collapses and the current screen stays open                                      |
| 5   | Rail expanded, focus on a destination | Select           | The destination opens and the rail collapses                                              |
| 6   | Any screen after step 5               | Left             | The rail expands with the destination from step 5 focused                                 |
| 7   | Feed scrolled down, rail collapsed    | Left, then Right | The scroll position, column count, and card size are unchanged                            |
| 8   | Screen that hides the rail            | Left             | The rail becomes visible again and can be focused                                         |
| 9   | Signed out                            | Open the rail    | Sign in is offered; Subscriptions, History, Library, and My YouTube are not shown         |
| 10  | Signed in                             | Open the rail    | Subscriptions, History, Library, and My YouTube are shown; Sign in is not shown           |
| 11  | Any destination                       | Open the rail    | The active destination is marked as selected even while the rail is collapsed             |
| 12  | Home -> video -> Back                 | Back             | The feed returns with the previous scroll position and focus target                       |

Record deviations with device, OS version, and step number before migrating
further screens.
