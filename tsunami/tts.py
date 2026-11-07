import sys, sherpa_onnx, soundfile as sf
d='/home/user/tsunami-video/tts/vits-piper-pt_BR-faber-medium/'
cfg=sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=d+'pt_BR-faber-medium.onnx',tokens=d+'tokens.txt',data_dir=d+'espeak-ng-data'),num_threads=4))
tts=sherpa_onnx.OfflineTts(cfg)
def say(text,out,speed=1.0,sid=0):
    a=tts.generate(text,sid=sid,speed=speed); sf.write(out,a.samples,a.sample_rate)
if __name__=='__main__': say(sys.argv[1],sys.argv[2],float(sys.argv[3]) if len(sys.argv)>3 else 1.0)
