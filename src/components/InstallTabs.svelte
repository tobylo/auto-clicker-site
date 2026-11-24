<script lang="ts">
  import type { Platform } from '../data/program';

  interface Props {
    platforms: Platform[];
    repo: string;
  }

  let { platforms, repo }: Props = $props();

  let selected = $state(0);

  function select(index: number) {
    selected = (index + platforms.length) % platforms.length;
    document.getElementById(`tab-${platforms[selected].id}`)?.focus();
  }

  function onkeydown(event: KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowRight: selected + 1,
      ArrowLeft: selected - 1,
      Home: 0,
      End: platforms.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  }
</script>

<div class="block">
  <div class="tabs" role="tablist" aria-label="Platform" tabindex="-1" {onkeydown}>
    {#each platforms as platform, index (platform.id)}
      <button
        id="tab-{platform.id}"
        role="tab"
        type="button"
        aria-selected={selected === index}
        aria-controls="panel-{platform.id}"
        tabindex={selected === index ? 0 : -1}
        onclick={() => (selected = index)}
      >
        {platform.label}{platform.status === 'soon' ? ' · soon' : ''}
      </button>
    {/each}
  </div>

  {#each platforms as platform, index (platform.id)}
    <div
      id="panel-{platform.id}"
      role="tabpanel"
      aria-labelledby="tab-{platform.id}"
      hidden={selected !== index}
      tabindex="0"
    >
      {#if platform.status === 'available'}
        <pre><code
            >{#each platform.lines as line, i (i)}<span class="line"
                >{#if 'command' in line}<span class="prompt" aria-hidden="true">$ </span>{line.command}{:else}<span
                    class="remark"># {line.remark}</span
                  >{/if}</span
              >{/each}</code
          ></pre>
        <p class="scope">{platform.scope}.</p>
        {#if platform.note}
          <p class="note">
            {platform.note.text}
            <a href={platform.note.link}>{platform.note.linkText} ↗</a>
          </p>
        {/if}
      {:else}
        <p class="soon-text">
          The {platform.label} build is on its way, for {platform.scope}. Until it is released, there is
          nothing to install: <a href={repo}>watch the repository ↗</a> for the first release.
        </p>
      {/if}
    </div>
  {/each}
</div>

<style>
  .block {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: clamp(20px, 2.5vw, 28px);
    background: var(--bg-raised);
    border-left: 3px solid var(--green);
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 28px;
  }

  button {
    padding: 0 0 6px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-faint);
    font: inherit;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  button[aria-selected='true'] {
    border-bottom-color: var(--green);
    color: var(--green);
    font-weight: 700;
  }

  button:hover {
    color: var(--green);
  }

  pre {
    margin: 0;
    overflow-x: auto;
    font-family: inherit;
    font-size: clamp(13px, 1.1vw, 15px);
    line-height: 1.9;
    color: var(--text-body);
  }

  .line {
    display: block;
  }

  .prompt {
    color: var(--green);
    user-select: none;
  }

  .remark {
    color: var(--text-faint);
  }

  .scope,
  .note,
  .soon-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  .scope {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
  }

  .note {
    margin-top: 6px;
  }

  a {
    color: var(--green);
  }
</style>
