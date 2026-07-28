import fs from 'node:fs';
import axios, {isAxiosError} from 'axios';
import execa from 'execa';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import {
	getBinDir,
	getCacheKeyPrefix,
	getPluginsDir,
	getShimsDir,
	getToolchainCacheKey,
	getToolsDir,
	getUidFile,
	getWorkspaceRoot,
	installBin,
	isCacheEnabled,
	isUsingMoon,
	shouldInstallMoon,
} from './helpers';

async function validateSubscription() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  let repoPrivate: boolean | undefined

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8')) as { repository?: { private?: boolean } }
    repoPrivate = eventData?.repository?.private
  }

  const upstream = 'moonrepo/setup-toolchain';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl = 'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';

  core.info('');
  core.info('\u001B[1;36mStepSecurity Maintained Action\u001B[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) core.info('\u001B[32m✓ Free for public repositories\u001B[0m');
  core.info(`\u001B[36mLearn more:\u001B[0m ${docsUrl}`);
  core.info('');

  if (repoPrivate === false) return;

  const HTTP_FORBIDDEN = 403;
  const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
  const body: Record<string, string> = { action: action ?? '' };
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body, { timeout: 3000 }
    );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === HTTP_FORBIDDEN) {
      core.error(`\u001B[1;31mThis action requires a StepSecurity subscription for private repositories.\u001B[0m`);
      core.error(`\u001B[31mLearn how to enable a subscription: ${docsUrl}\u001B[0m`);
      throw new Error('StepSecurity subscription required for private repositories.');
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

async function restoreCache() {
	if (!isCacheEnabled()) {
		return;
	}

	core.info('Attempting to restore cached toolchain');

	const primaryKey = await getToolchainCacheKey();
	const cachePrefix = getCacheKeyPrefix();

	const cacheKey = await cache.restoreCache(
		[getPluginsDir(), getToolsDir(), getUidFile()],
		primaryKey,
		[`${cachePrefix}-${process.platform}-${process.arch}`],
	);

	if (cacheKey) {
		core.saveState('cacheHitKey', cacheKey);
		core.info(`Toolchain cache restored using key ${primaryKey}`);
	} else {
		core.info(`Toolchain cache does not exist using key ${primaryKey}`);
	}

	core.setOutput('cache-key', cacheKey ?? primaryKey);
	core.setOutput('cache-hit', !!cacheKey);
}

async function run() {
	await validateSubscription();
	try {
		const shimsDir = getShimsDir();
		const binDir = getBinDir();

		core.info(`Added ${shimsDir} and ${binDir} to PATH`);
		core.addPath(binDir);
		core.addPath(shimsDir);

		await installBin('proto');

		if (isUsingMoon() && shouldInstallMoon()) {
			await installBin('moon');
		}

		await restoreCache();

		if (core.getBooleanInput('auto-install')) {
			core.info('Installing proto tools');

			await execa('proto', ['install'], { cwd: getWorkspaceRoot(), stdio: 'inherit' });
		}

		if (isUsingMoon() && core.getBooleanInput('auto-setup')) {
			core.info('Setting up moon toolchains');

			await execa('moon', ['setup'], { cwd: getWorkspaceRoot(), stdio: 'inherit' });
		}
	} catch (error: unknown) {
		core.setFailed(error as Error);
	}
}

void run();
