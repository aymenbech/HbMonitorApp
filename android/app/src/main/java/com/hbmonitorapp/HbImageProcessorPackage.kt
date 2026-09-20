package com.hbmonitorapp
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class HbImageProcessorPackage : ReactPackage {

  override fun createNativeModules(
    reactContext: ReactApplicationContext
  ): MutableList<NativeModule> {
    val modules: MutableList<NativeModule> = mutableListOf()
    modules.add(HbImageProcessorModule(reactContext))
    return modules
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): MutableList<ViewManager<*, *>> {
    return mutableListOf()
  }
}