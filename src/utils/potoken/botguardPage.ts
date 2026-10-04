/**
 * The page that runs BotGuard inside the invisible WebView (plan phase 5.1).
 *
 * Ported from SmartTube's `po_token2.html` / `PoTokenWebView4.kt` (MIT,
 * originally from NewPipe and LuanRT's BgUtils) and aligned with
 * `bgutils-js`' `BotGuardClient`. Network requests (homepage, `GenerateIT`)
 * stay on the React Native side; the page only executes the VM and mints.
 *
 * Protocol: React Native calls `window.__potoken.*` via `injectJavaScript`;
 * the page answers with `ReactNativeWebView.postMessage(JSON)` messages of the
 * shape `{id, ok, value | error}`.
 */
export const BOTGUARD_PAGE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title></title><script>
(function () {
  var state = { vmFunctions: null, signalOutput: null, mintCallback: null };

  function reply(id, ok, value) {
    var message = { id: id, ok: ok };
    if (ok) message.value = value; else message.error = String(value && value.stack || value);
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Could not load ' + url)); };
      document.head.appendChild(script);
    });
  }

  function waitForVmFunctions(timeoutMs) {
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function poll() {
        if (state.vmFunctions && state.vmFunctions.asyncSnapshotFunction) return resolve(state.vmFunctions);
        if (Date.now() - started > timeoutMs) return reject(new Error('asyncSnapshotFunction missing'));
        setTimeout(poll, 5);
      })();
    });
  }

  function toWebsafeBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_');
  }

  function fromBase64(text) {
    var binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  window.__potoken = {
    /** Runs the challenge and answers with the BotGuard snapshot. */
    start: function (id, challenge) {
      state = { vmFunctions: null, signalOutput: [], mintCallback: null };
      // BotGuard reads EVENT_ID from yt.config_; tokens minted without it
      // are rejected.
      if (challenge.ytcfg) window.yt = { config_: challenge.ytcfg };

      loadScript(challenge.interpreterUrl).then(function () {
        var vm = window[challenge.globalName];
        if (!vm || !vm.a) throw new Error('BotGuard VM unavailable');
        var noop = function () {};
        // Same arguments as bgutils-js' BotGuardClient#load: telemetry
        // callback, two empty experiment lists, then the logger functions.
        vm.a(challenge.program, function (asyncSnapshot, shutdown, passEvent, checkCamera) {
          state.vmFunctions = { asyncSnapshotFunction: asyncSnapshot, shutdownFunction: shutdown };
        }, true, undefined, noop, [[], []], undefined, false, [noop, noop, noop, noop, noop]);
        return waitForVmFunctions(10000);
      }).then(function (vmFunctions) {
        return new Promise(function (resolve) {
          vmFunctions.asyncSnapshotFunction(function (response) { resolve(response); },
            [undefined, undefined, state.signalOutput, undefined]);
        });
      }).then(function (botguardResponse) {
        if (!state.signalOutput.length) throw new Error('webPoSignalOutput is empty');
        reply(id, true, botguardResponse);
      }).catch(function (error) { reply(id, false, error); });
    },

    /** Unlocks the minter with the integrity token from GenerateIT. */
    unlock: function (id, integrityToken) {
      try {
        var getMinter = state.signalOutput && state.signalOutput[0];
        if (!getMinter) throw new Error('PMD:Undefined');
        Promise.resolve(getMinter(fromBase64(integrityToken))).then(function (mintCallback) {
          if (typeof mintCallback !== 'function') throw new Error('APF:Failed');
          state.mintCallback = mintCallback;
          reply(id, true, null);
        }).catch(function (error) { reply(id, false, error); });
      } catch (error) { reply(id, false, error); }
    },

    /** Mints a token bound to the identifier (a video id). */
    mint: function (id, identifier) {
      try {
        if (!state.mintCallback) throw new Error('Minter not unlocked');
        Promise.resolve(state.mintCallback(new TextEncoder().encode(identifier))).then(function (result) {
          if (!(result instanceof Uint8Array)) throw new Error('ODM:Invalid');
          reply(id, true, toWebsafeBase64(result));
        }).catch(function (error) { reply(id, false, error); });
      } catch (error) { reply(id, false, error); }
    }
  };
})();
</script></head><body></body></html>`;
