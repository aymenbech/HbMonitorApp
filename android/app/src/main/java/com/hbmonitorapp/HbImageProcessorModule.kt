package com.hbmonitorapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

class HbImageProcessorModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "HbImageProcessor"

  @ReactMethod
  fun getRgbaFromImage(
    filePath: String,
    targetWidth: Int,
    targetHeight: Int,
    promise: Promise
  ) {
    try {
      // 1. تحميل الـ Bitmap من المسار (filePath يأتي من photo.filePath في JS)
      val bitmap = BitmapFactory.decodeFile(filePath)
      if (bitmap == null) {
        promise.reject("HB_IMAGE_ERROR", "Could not decode image from path: $filePath")
        return
      }

      // 2. إعادة تحجيم الصورة إلى targetWidth x targetHeight
      val scaled = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)

      val width = scaled.width
      val height = scaled.height
      val pixelCount = width * height

      // 3. مصفوفة Int لكل البكسلات
      val pixels = IntArray(pixelCount)
      scaled.getPixels(pixels, 0, width, 0, 0, width, height)

      // 4. تحويل كل بكسل إلى RGBA في مصفوفة Uint8Array (JS side)
      val result: WritableArray = Arguments.createArray()
      for (i in 0 until pixelCount) {
        val color = pixels[i]
        val r = (color shr 16) and 0xFF
        val g = (color shr 8) and 0xFF
        val b = color and 0xFF
        val a = (color shr 24) and 0xFF

        result.pushInt(r)
        result.pushInt(g)
        result.pushInt(b)
        result.pushInt(a)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("HB_IMAGE_EXCEPTION", e.message, e)
    }
  }
}