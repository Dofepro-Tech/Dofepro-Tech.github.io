package com.dofepro.biblianj;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "AppShare")
public class AppSharePlugin extends Plugin {
    @PluginMethod
    public void shareInstalledApk(PluginCall call) {
        String title = getTrimmedValue(call.getString("title"));
        String text = getTrimmedValue(call.getString("text"));
        String fileName = sanitizeFileName(call.getString("fileName"));
        String dialogTitle = getTrimmedValue(call.getString("dialogTitle"));

        try {
            File apkFile = copyInstalledApkToCache(fileName);
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/vnd.android.package-archive");
            shareIntent.putExtra(Intent.EXTRA_STREAM, apkUri);

            if (!title.isEmpty()) {
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            }

            if (!text.isEmpty()) {
                shareIntent.putExtra(Intent.EXTRA_TEXT, text);
            }

            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooserIntent = Intent.createChooser(shareIntent, dialogTitle.isEmpty() ? title : dialogTitle);
            chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getActivity().startActivity(chooserIntent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to share installed APK.", error);
        }
    }

    private File copyInstalledApkToCache(String fileName) throws IOException {
        ApplicationInfo applicationInfo = getContext().getApplicationInfo();
        File sourceFile = new File(applicationInfo.sourceDir);
        File cacheDirectory = new File(getContext().getCacheDir(), "shared-apks");

        if (!cacheDirectory.exists() && !cacheDirectory.mkdirs()) {
            throw new IOException("Unable to create APK cache directory.");
        }

        File destinationFile = new File(cacheDirectory, fileName);

        try (FileInputStream inputStream = new FileInputStream(sourceFile);
             FileOutputStream outputStream = new FileOutputStream(destinationFile, false)) {
            byte[] buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }

            outputStream.flush();
        }

        return destinationFile;
    }

    private String sanitizeFileName(String fileName) {
        String candidate = getTrimmedValue(fileName);
        if (candidate.isEmpty()) {
            return "biblia-nj-android.apk";
        }

        String normalized = candidate.replaceAll("[^A-Za-z0-9._-]", "-");
        if (!normalized.toLowerCase().endsWith(".apk")) {
            normalized = normalized + ".apk";
        }

        return normalized;
    }

    private String getTrimmedValue(String value) {
        return value == null ? "" : value.trim();
    }
}