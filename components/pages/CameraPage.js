import {View, Button, Text, ScrollView, Dimensions} from 'react-native';
import React, {Component} from 'react';
import {styles} from '../Styles';
import {RNCamera} from 'react-native-camera';
import ImageEditor from "@react-native-community/image-editor";
import ImgToBase64 from 'react-native-image-base64';
import {Image} from 'react-native';
import CustomButton from "../CustomButton";
import AplanaLogo from "../AplanaLogo";

class CameraPage extends Component {

    constructor() {
        super();
        this.statuses = [
            "Наведите на счетчик и сделайте снимок",
            "Ожидайте",
            "Не удалось распознать"
        ];
        this.statusesStyles = [
            styles.bgGrey,
            styles.bgGrey,
            styles.bgRed
        ];
        this.state = {
            base64: null,
            response: 0
        }
    }


    render() {
        let isDisabled = (this.state.response === 1);
        return (
            <View style={styles.cameraPage}>
                <View style={[styles.container, {borderRadius: 30}]}>
                    <RNCamera
                        ref={ref => {
                            this.camera = ref;
                        }}
                        captureAudio={false}
                        style={styles.camera}
                        type={RNCamera.Constants.Type.back}
                        flashMode={RNCamera.Constants.FlashMode.auto}
                        autoFocus={true}
                    />
                </View>
                <View style={styles.snapButton}>
                    <CustomButton disabled={isDisabled}
                                  onPress={this.takePicture.bind(this)} text={'Сделать снимок'}
                                  cameraImg={true}/>
                </View>
                <View>
                    <Text style={[styles.fetchStatusLabel, this.statusesStyles[this.state.response]]}>
                        {this.statuses[this.state.response]}
                    </Text>
                </View>
                <View style={styles.containerCenter}>
                    <AplanaLogo/>
                </View>
            </View>
        );
    }

    takePicture = async () => {
        this.setState({response: 1});
        if (this.camera) {
            const options = {
                base64: true,
                quality: 0.5,
                fixOrientation: true,
                exif: true
            };
            let data = await this.camera.takePictureAsync(options);
            let newWidth = data.width * 0.78;
            ImageEditor.cropImage(data.uri, {
                offset: {x: (data.width - newWidth) / 2, y: 0},
                size: {width: newWidth, height: newWidth * 0.3},
                displaySize: {width: newWidth, height: newWidth * 0.3}
            }).then((res) => {
                ImgToBase64.getBase64String(res)
                    .then(base64String => {
                        this.setState({base64: base64String}, this.sendToApi)
                    });
            });
        }
    };

    checkResult(result) {
        let res = result.replace(/[^0-9]/g, '');
        if (res.length > 0) {
            this.props.navigation.navigate('ConfirmPage', {res: res})
        } else {
            this.setState({response: 2});
        }
    }

    makeResponseStr(response) {
        let str = '';
        let page = JSON.parse(response)['results'][0]['results'][0]['textDetection']['pages'][0];
        if ('blocks' in page) {
            page['blocks'].forEach(
                function (block) {
                    block['lines'].forEach(
                        function (line) {
                            line['words'].forEach(
                                function (word) {
                                    str += word['text'];
                                }
                            );
                            str += " \n "
                        }
                    )
                }
            );
        } else {
            str = 'Ничего не найдено'
        }
        return str;
    }

    sendToApi() {
        let body = JSON.stringify({
            "analyze_specs": [{
                "content": this.state.base64,
                "mime_type": "image/jpeg",
                "features": [{
                    "type": "TEXT_DETECTION",
                    "text_detection_config": {
                        "language_codes": ["ru", "en"],
                        "model": "line"
                    }
                }]
            }]
        });
        // fetch('https://webhook.site/d8c74c1d-b13d-4ceb-8414-03137eeabb94', {
        //     method: "POST",
        //     body: this.state.base64,
        // });
        fetch(
            'https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze',
            // 'https://webhook.site/3a023efd-471a-4b85-bf93-952ed0c10f26',
            {
                method: "POST",
                headers: {
                    'Content-Type': "application/json",
                    'Authorization': "Api-Key AQVN30U4ze8tyv3Khw3fZ-IKU3LghOHwd5fwKic_"
                },
                body: body
            }
        )
            .then((response) => response.text())
            .then((response) => this.checkResult(this.makeResponseStr(response)))//.results[0].results
    }
}

export default CameraPage;
