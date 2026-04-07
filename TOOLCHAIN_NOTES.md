# TOOLCHAIN_NOTES

```text
.
├── .env.example
├── .eslintrc.json
├── .git
│   ├── COMMIT_EDITMSG
│   ├── config
│   ├── description
│   ├── HEAD
│   ├── hooks
│   │   ├── applypatch-msg.sample
│   │   ├── commit-msg.sample
│   │   ├── fsmonitor-watchman.sample
│   │   ├── post-update.sample
│   │   ├── pre-applypatch.sample
│   │   ├── pre-commit.sample
│   │   ├── pre-merge-commit.sample
│   │   ├── pre-push.sample
│   │   ├── pre-rebase.sample
│   │   ├── pre-receive.sample
│   │   ├── prepare-commit-msg.sample
│   │   ├── push-to-checkout.sample
│   │   ├── sendemail-validate.sample
│   │   ├── update.sample
│   ├── index
│   ├── info
│   │   ├── exclude
│   ├── logs
│   │   ├── HEAD
│   │   ├── refs
│   │   │   ├── heads
│   │   │   │   ├── feat
│   │   │   │   │   ├── 04-monorepo-scaffold
│   │   │   │   ├── main
│   │   │   │   ├── security
│   │   │   │   │   ├── 03-precommit-hooks
│   │   │   ├── remotes
│   │   │   │   ├── origin
│   │   │   │   │   ├── main
│   ├── objects
│   │   ├── 03
│   │   │   ├── 8b4003296691f47597e5b1aa69125d6a4119e9
│   │   │   ├── 998d1ad09d1d4c55baa1f80bcd90e2482e0f00
│   │   ├── 06
│   │   │   ├── 6fa7452c6b9afced9b4daca29cd68d038d901a
│   │   ├── 07
│   │   │   ├── 46e945ead528f6c7045062d91512aa2c2b517b
│   │   ├── 08
│   │   │   ├── 0e2aaf0b857f73daf2a2224da473f59d4c14ec
│   │   │   ├── 5f7f7b1b097461ea1ce951a4e524380b5403ef
│   │   │   ├── cbb36160ec027b404a900ab7fc4d6257476aef
│   │   │   ├── e1150238509c68bcb6742853af81f67459c1a8
│   │   │   ├── f0b23c779d1a03159e4b1e85195249d7123bf0
│   │   ├── 09
│   │   │   ├── 243053718b2ca7cb3478ab2bd43e6995d2bca7
│   │   │   ├── 3404000073aa299572955c0dac37f12843884d
│   │   │   ├── ae84da588d5abd95e2643beced22d4c71f9451
│   │   │   ├── fae168dfd7eaa33610b1f35c710f7ca3e3b079
│   │   ├── 0a
│   │   │   ├── 70f9237f8170636dec47d87cb8d55f60a72f6c
│   │   ├── 0b
│   │   │   ├── 110ea8bb9aa5d6fe7ad7647250537d2fc8beac
│   │   │   ├── 40d692c64301b9724d1e825d9a332c948c54ff
│   │   │   ├── c0843299a2ba95e194870b5819631505221319
│   │   │   ├── cb8ad766b373a2dd514550535b6e33171ec657
│   │   │   ├── df3336e24533b3d2a216ca53f17c0943eb90e6
│   │   ├── 0d
│   │   │   ├── 0bab82254e7e32efda5e21063623d3b508c29e
│   │   │   ├── cecb995b50d4687e5bfdbd0bca414063176e01
│   │   │   ├── e0fce935273431398dfad48591a77bdbb59422
│   │   ├── 0e
│   │   │   ├── 1f65c95ba2cec61590b9945535a44f3c880b62
│   │   │   ├── 4ef2b05824a29c5576cf9b7a435d746c2c8dde
│   │   │   ├── 999488f0899c9884391d23d28d8db5ba9e90d8
│   │   ├── 10
│   │   │   ├── 7c85078b196b71e959fb1a505b32e305301810
│   │   │   ├── 830864c12f668ced43dda96df065f6774a144f
│   │   ├── 11
│   │   │   ├── 09de4a52747ebc08350771f413083642c45ebe
│   │   │   ├── 3295addb1f84f2fbf11ae8d07a751154ef3576
│   │   │   ├── 7994c9a5e6b0ca121da302d002d7d10adc4773
│   │   ├── 12
│   │   │   ├── 0f1772c468d1b19e0b7a8bcab9d02992195890
│   │   │   ├── 429b8c5b8ca2b40c51dd6ef330bee69b84e151
│   │   ├── 14
│   │   │   ├── 67b17e0bc1d0d2baeb58b83bdfda5b28975249
│   │   ├── 16
│   │   │   ├── 134079ce08b7ed23d18e4ad29186117ed7bf6c
│   │   ├── 17
│   │   │   ├── d759db9b7d01d909b78b8975ff2607df52f20e
│   │   ├── 18
│   │   │   ├── 26386113e8e3f2e349023b47c9485cd422ad10
│   │   ├── 19
│   │   │   ├── 30a96a9bb6723abe24d280e427ce5ad7d87b68
│   │   │   ├── a3aa62131d115f4dee3a5f8f8c51d8b5bdf4c0
│   │   ├── 1a
│   │   │   ├── 8b09a41d4182c24a80d4e41af93414564044fe
│   │   ├── 1b
│   │   │   ├── a38b37f4f065f5139ac0051a90055b2794aabe
│   │   │   ├── ef9857d9670119422d175a4b45cc48dc570f3e
│   │   ├── 1c
│   │   │   ├── 8d1f27db02e92785d6f060ac083d145b909ca7
│   │   ├── 1d
│   │   │   ├── 884e2f4081d39b3fe93495237618759aff4143
│   │   ├── 1f
│   │   │   ├── 0f5e9d32c20ca994c86ec6fc6c88a74e901698
│   │   │   ├── 27a660c350b977ac3e60410f7c88b4a3387b40
│   │   ├── 20
│   │   │   ├── 1f5745fc5201930d452221d1f1c2eeb6272df0
│   │   │   ├── 54e956e05dff61db8cc8a81d0e12dfd5e0c508
│   │   │   ├── 9e3ef4b6247ce746048d5711befda46206d235
│   │   ├── 21
│   │   │   ├── 33c475dafa4f52a72c0fd204cac441135e1e74
│   │   │   ├── 417c86a7bc52dcf2e6649ff1a618735e7c254d
│   │   ├── 22
│   │   │   ├── 8af32d92d825acdb22156d212ad8d3a1e6c45f
│   │   │   ├── cb5c18cbbcafb6c4ff19c8bb94d40263765ede
│   │   ├── 23
│   │   │   ├── 135f7b4c7ba6f3a96b09bc9b6a2dc886f06473
│   │   │   ├── 7319cb6f8ae31fe2d279fa1e627662e80f54d6
│   │   │   ├── a63f7a42088da3b01471cf1ddf17c05d07d399
│   │   │   ├── a98773c2711644bccbdffaa58908efac83c237
│   │   │   ├── eec1b7f0b1f6bb30ef923bceb9c46f906c3e8c
│   │   │   ├── f2cb7e3384c7f4ab3e2fcb143aa9eee6253d92
│   │   ├── 24
│   │   │   ├── 6090a51df524e962894607e746547b59c498cb
│   │   │   ├── 9e359db8252b2c3d946f6c7fe3f54f79bd6cbe
│   │   │   ├── e22aeb14149bd2d681ef67d10ec670b3ea2c1f
│   │   ├── 25
│   │   │   ├── b881dee512209a0623fcbb3088a2ae2b30c57c
│   │   │   ├── de19254cb4ddff8938c0f6a272cbaa63d7cf54
│   │   ├── 26
│   │   │   ├── 1876cd7c660870d7ed06999ee1a1ca24cc5029
│   │   │   ├── 19daab11a3226e9dc77c14b6391b7e0cf4ac03
│   │   │   ├── bc914a3e038408e49e27324a40ae694fe43166
│   │   │   ├── d051681317d6d62d3ee9e06ea83b41ad421cdb
│   │   ├── 27
│   │   │   ├── 1b7f47a5827d4445d0f8bae7fc06ce16859d7f
│   │   ├── 28
│   │   │   ├── a7a2a3baefe6174a1ac872fefbf19dcdc07ba6
│   │   ├── 29
│   │   │   ├── 3c12094a04375af6d6b8a760f5a8250b4db274
│   │   ├── 2a
│   │   │   ├── 7bad0e9cab9116fd159f67db9cae496ef32490
│   │   │   ├── ea6ac16f4cd612b59a9598e758ba1975a62493
│   │   │   ├── eff2605e935152723f478b1e64fc6f0b4563d1
│   │   ├── 2b
│   │   │   ├── acfaa20a6f651612770e425a7e3ff44bbb0536
│   │   │   ├── ed13504b9e29cb275ca9e5bad9f2cffd5f76d7
│   │   ├── 2c
│   │   │   ├── 0f797a2b95a63c457c02023297122f4c2e36ad
│   │   │   ├── 38e735b6cca5f80aaf4fc210a326d0b2c9f498
│   │   ├── 2d
│   │   │   ├── 4224e540f3cd32f920522d55d44a2ce8fdb155
│   │   │   ├── e5d67bd040fef8e68d788d7e66b786d25a2d6e
│   │   ├── 2e
│   │   │   ├── c71e8ac3f708601729e5d6ad30b3a9f2dc2328
│   │   ├── 2f
│   │   │   ├── 4daa3fb440975feecf0e29ab01087324fec277
│   │   ├── 30
│   │   │   ├── 4285f56688b6e05ab287acc336010e6ef4b43f
│   │   │   ├── 52e43ccd7d6e76acb6f8b7485390753f42f7b1
│   │   ├── 31
│   │   │   ├── c28cc13fe3c40e6f660d1f14517989deb8ce81
│   │   │   ├── ff1d956e870053bdf5628bcae3bddfc069ea57
│   │   ├── 32
│   │   │   ├── 3e6f44c894b6876d442fc24c35c7ad152fa595
│   │   │   ├── dcad516fe1df7e80d3dd090f85698df9a16e7d
│   │   ├── 33
│   │   │   ├── 00ab4a57a4197242934d649b3e4d577278711e
│   │   │   ├── df4efc00722e9d86317d51374667ced8852c96
│   │   │   ├── e61f8298ae5ecfdc95b3702e16af1b6aab106b
│   │   ├── 34
│   │   │   ├── f9d90707facc2782424b6df52bee850eef20bc
│   │   ├── 35
│   │   │   ├── 6bfcafce3b195934dd4cc8d069b0afb9c2517c
│   │   │   ├── b49b028167a14735a1315eb0e47ae04f977c76
│   │   │   ├── ea2323c8fd432a98449e45b21dd7cc04857bdc
│   │   ├── 37
│   │   │   ├── 46f23ab4ed8e5a182ceadd361c4c9921a35f4e
│   │   │   ├── 685742d9ba317d4e0364151b8c9a9031f93359
│   │   │   ├── 69db98fafa2f9f88330e1612bbe7fd87eaff42
│   │   │   ├── e24aaa531ccbd4ecce448825f31191aadcfa02
│   │   │   ├── f3f0794d38a17e6322acc40cd4925ed61aa548
│   │   ├── 38
│   │   │   ├── 44b9bab1abf81a6aedf54a3adb25d98b6bd708
│   │   │   ├── 4d839fe62ba416feb54e3d7d4b83c704adb390
│   │   │   ├── a26c78eee90e5221fb7a020cf2bd1a76d37be1
│   │   ├── 39
│   │   │   ├── 127e1599943e1a49e69938579098ffc5152e5e
│   │   ├── 3a
│   │   │   ├── 26860bb3cd3b8d8f0d243ccd14f0567a348ba5
│   │   │   ├── 3a67c96e032bfca7dc3a8811128ee050f80f36
│   │   │   ├── 511a89633edf30a3d582751dc4e48c1a56f34a
│   │   │   ├── 80241fb762437f6a2ee29d66d9276e5fbd0ba1
│   │   │   ├── 98b910d966529c5a5baf3e30fd38a8833a1036
│   │   ├── 3c
│   │   │   ├── 1378c2997258602ea0652d4bdbf7e99e9770b3
│   │   │   ├── 3f12059d1d5d489de0b550ca0229dfe3f4a98d
│   │   │   ├── dcbea39efbd7e4f611717e5ebd912c8860a79a
│   │   │   ├── fe6040d092d0031b341f2594a37a352fea4445
│   │   ├── 3d
│   │   │   ├── 8b3805166e63f6a2b41357c82b8ff6835fbbc5
│   │   │   ├── dee1c6c22667c19430894226ce942cf1510cc2
│   │   ├── 3f
│   │   │   ├── d566a6acc3350376836064d14636b5eb3052f6
│   │   │   ├── fb18a6e33ec74438d4a6ecda2b5f57a2e0dd3a
│   │   ├── 40
│   │   │   ├── 7d1bda9e295191649787f23c07d1b0ad7e5a22
│   │   ├── 41
│   │   │   ├── 7130767f587ed587f44bc559ff24287cfecba6
│   │   ├── 42
│   │   │   ├── d6ca833bd97512684d86e9e5db8b6d60536627
│   │   ├── 44
│   │   │   ├── 105e44a716d871321a858f7935da38859ef1ff
│   │   │   ├── b2cb7e4316765c9fd1f60a0761106d952a2702
│   │   │   ├── bee79ff370b045f2e0c529d5fcd6c6b0692bb4
│   │   ├── 45
│   │   │   ├── 169374a9ff9ab48569d41a00ef9402ba90b40c
│   │   ├── 46
│   │   │   ├── 15e3388b9b1a7e224b69de0680ed13a58b0d0a
│   │   │   ├── 4d2e77c7c9efc723f30c2aed51e1e2923a56fc
│   │   │   ├── a1cb430cf2089487fb2f51fc977b625a9f69af
│   │   ├── 47
│   │   │   ├── 23fa7f631cc3cf6d7d1cf99b0595e3a081e95a
│   │   ├── 48
│   │   │   ├── 704edb4e220d88b40cd451d643129d7768befd
│   │   │   ├── 91fd7b92be42327d808d4365c8e1b79f364578
│   │   ├── 49
│   │   │   ├── f8429fdbcdf67e1b681830024983a84c426867
│   │   ├── 4a
│   │   │   ├── 1157ce91a67b9c1031a3232cea3e6ee25a7dbd
│   │   │   ├── 7cd36f50d8c99e143139acccdfff359efc970c
│   │   │   ├── e4cf7fcbf92da5d406650a73a79b4f63c18cc7
│   │   ├── 4e
│   │   │   ├── 1c7fcb81f399cbe0104400822cbb16ef354550
│   │   │   ├── e4f2e7749691a050a20cac4275afbc904d2e14
│   │   ├── 4f
│   │   │   ├── 1133ef87ae1ae53de8bfac4a6a1ed6e785c227
│   │   ├── 51
│   │   │   ├── d04d643340b4350bc478bc0ae0b36ad49c587c
│   │   ├── 52
│   │   │   ├── 6d386f29f0a34e3d190aae5dd7ca7bb7426b32
│   │   ├── 53
│   │   │   ├── c2e7b8e4af984141da090d2fff9f9eba27111a
│   │   ├── 54
│   │   │   ├── fb7b28a2d89498ac62782227e14b82d4e2d512
│   │   │   ├── fde7cb29e3821e33c6229c5d5947b78acb24c3
│   │   ├── 55
│   │   │   ├── 3d2bc8fb0f6c851f3ccbd1210635fc9d17fdac
│   │   │   ├── 84e0abf8b566a8a58a2cea61a6b5bb11ab898b
│   │   ├── 56
│   │   │   ├── 6f82d5f34708ba9049d725fea022468d677ece
│   │   │   ├── 8ba911ad5a8a44d0797fabf746c4130c54905b
│   │   ├── 57
│   │   │   ├── 31311f05c67b75064d1cc519add2f983d24838
│   │   │   ├── e55d122988f664f5ce336202dffe06eff164cb
│   │   ├── 58
│   │   │   ├── 0d9be0e970e38a97859085e3b7d1d371355e99
│   │   │   ├── 175de49e06e210978a8001f90176960158cf6f
│   │   │   ├── 256a4c154a286e2c9c45940d03a3f43f515561
│   │   │   ├── 29dd83868684097193b10619b796b183816e64
│   │   │   ├── 94ee60018fa2b0a776eaf1c25db1b3c4f2dfec
│   │   │   ├── e40baa7954958ba222c528006f10e35ea23cc6
│   │   ├── 59
│   │   │   ├── a92f533c1f0733e5f7a61c13b4318a5e4e89cf
│   │   │   ├── c1509c9959c0f9c68ff1d4e5f3e8745d709fca
│   │   │   ├── e42004677c94e9eba352c7a0e05b6338e4f987
│   │   ├── 5b
│   │   │   ├── 4f3773b6cb9225888198f5e32e7a07f47e380d
│   │   ├── 5c
│   │   │   ├── d277611387bf47159b5d9d3695c3efeabf5658
│   │   ├── 5d
│   │   │   ├── eb0e6dfad943529ac0242795d46f989952faff
│   │   ├── 5e
│   │   │   ├── 38300ba42d339bb087b23dbd1a4c423fa1050c
│   │   │   ├── 4b98e4a0eaad99cdccf4b13c8d351a91dc402e
│   │   │   ├── 8933666c57099f30ad1a4ac59a1d6c184e9b03
│   │   │   ├── c20eb0c659c4fa1d9fc3d4f62118d388b8ae5d
│   │   ├── 5f
│   │   │   ├── 06d2977a1fefeb2732bc177d586944474df2f9
│   │   │   ├── 12aedf7fdc4edd3220b151215c235802727666
│   │   │   ├── 829bdf92aa84ff51d693353606ac4f1fe208af
│   │   │   ├── 8a5253c2775dfc8cb21e4511fe0eb2bd2f5303
│   │   │   ├── f5fe4248ef24c98ba3939967230fb5a9ec1a1c
│   │   ├── 60
│   │   │   ├── 17f333c31b90406125a643cf18ec760d7b38ad
│   │   │   ├── 476da8feaca952236661ae2ad6de44050680ec
│   │   │   ├── 5975d5142a087c57a60ca1b34fb2b54b72be62
│   │   ├── 61
│   │   │   ├── 6f9e28b3d11cd0e627459448d70fb5e8b72571
│   │   │   ├── 74647561bbd7ad028584fdf89bc021c318b8cb
│   │   │   ├── 95c328852ac5a1e0855636882fcd38a8423b4b
│   │   │   ├── adbf5b11981fa1d70db5c98746dbc8621d086d
│   │   │   ├── c147877bee87de09f39bdc288058197878422f
│   │   ├── 62
│   │   │   ├── 6422fdc9063729ee69a534303a9e5103959b91
│   │   │   ├── b3f70fa7d103bdc432b3f6af71b91d8107997f
│   │   │   ├── c0bbed53ea85d20417dd0a2a96efcd37e95d6c
│   │   ├── 64
│   │   │   ├── 0ee53ff4ac1d8240e92eb32c2e8336661eaa8d
│   │   │   ├── 579f82247853e55a736ecacd293fd952a5a094
│   │   ├── 65
│   │   │   ├── cdf688c2bd350b4547ee72817c251054f92ca1
│   │   ├── 66
│   │   │   ├── cb882f202612baa93e8b3b4eeb4a30d879baa8
│   │   │   ├── d92333eaacbac256e0f61b1b051316179ae6f6
│   │   ├── 67
│   │   │   ├── 7f3c86340cf8573c9635aac638e3ab01b2a79f
│   │   ├── 69
│   │   │   ├── 022db645cbae99d1be2d643d00452de97f9363
│   │   │   ├── 4189fc0d90ef9bc0d9a9a0fe1effd0b3c9f23d
│   │   │   ├── 6a332a1e6c7a10b9ab11f177496c1b2e8b1043
│   │   ├── 6a
│   │   │   ├── 9a51f4d4db2863274af3a1fd066415e6326846
│   │   │   ├── 9f8eff61162ae08cabf0fbc7915a67acbc1c3c
│   │   │   ├── bc1bf3549b40626ff33b01fb872e89d0c202a9
│   │   │   ├── c43f20289843e433b0129fa7f0e144a0d380a2
│   │   │   ├── dd41a708220e3b6d32471105c56cebe4e10cf6
│   │   │   ├── e7ac033da5a26dba1b8b01f9d9d860bb100919
│   │   ├── 6b
│   │   │   ├── 6382fc901174a027f7ded1f5477462601712c0
│   │   │   ├── b0137a60f3889b3c3cab273c945beedfa868d6
│   │   ├── 6c
│   │   │   ├── 109e076270f8ff819c5357d7e405c409b8ff1d
│   │   │   ├── 8b5055313f0b0b279a17b98d4abdb9249732bc
│   │   ├── 6d
│   │   │   ├── 62d89c89d1882f01f2b6d560eb0db9d3b4d353
│   │   │   ├── eb75d8701ac6dd5132ccfe2e48f5b70b726b12
│   │   │   ├── f8989504d670648c1dee123b4a398925d0c255
│   │   ├── 6e
│   │   │   ├── 1182339ddb8383a45c1ac0f7bc70f137739d5c
│   │   │   ├── c609c7bd2b6ffc14a89e7741a063bb9c1eced3
│   │   ├── 6f
│   │   │   ├── dab63ed16e709733377f4e3a6f057f4af128d9
│   │   ├── 70
│   │   │   ├── 806369a78b0ca998356b4ac010351d8b5b07e1
│   │   ├── 71
│   │   │   ├── 6012af78da74dbf229a2de1a705cdb88874d94
│   │   │   ├── c86db9588f32329dadee5e481bfbbd3a0daccd
│   │   ├── 72
│   │   │   ├── 2eb4f01f98ee54cd64794882ff6b99e785156c
│   │   ├── 76
│   │   │   ├── 532d50305cd26220b49d10173a3bf2e6382b0a
│   │   │   ├── 744edfade498fe09ede2283f00b91f4937a25b
│   │   │   ├── 8159b699796ae63a348383f2a4dc055cab74ee
│   │   │   ├── 91a486893746725a2c76942311caef588c21b8
│   │   │   ├── c78246b53752b87d4578815fce0003d0cbdfab
│   │   │   ├── f31697493dc2eff883b291c271172cba25cc13
│   │   ├── 77
│   │   │   ├── c422d0f506bc2d8d3e087854078bc5c66a4100
│   │   ├── 78
│   │   │   ├── 810ea950aeeaefca8e88eb49fe6671fbd6b9a4
│   │   │   ├── 9f9776360a4923dba02b574339fad16b58d85d
│   │   ├── 79
│   │   │   ├── 79ab6185b20e746bedafc51834c876f9cea96b
│   │   │   ├── a6a306abaf81551af0f9ae4367a3b67e1fe2dc
│   │   │   ├── c22f48f1d98d6f491518b63fad3fac57a41017
│   │   │   ├── ffb9502a582bee79193dd1caf0112b7643593b
│   │   ├── 7a
│   │   │   ├── 85348ab705e87e6c1d84c3db8b74e3fb29ca87
│   │   │   ├── e3d9e2ab0790751429a4fca2e654b1bffc769b
│   │   │   ├── f676bc7a38e62c444f8efd6c6def97db4d9470
│   │   ├── 7b
│   │   │   ├── be90dee69dd0b1b80611e135b87b4eefd790ba
│   │   ├── 7c
│   │   │   ├── 099f71e10bdc452e2ae0d283e4f9b3331bb53f
│   │   │   ├── 11d7a786f13e10a5659925c13e68aaed6ebaed
│   │   │   ├── 342764ae78986f0d4d041f80032b1ca34d7b31
│   │   ├── 7d
│   │   │   ├── 02ded07163a3b71a386828ec6b3f4ab31add5a
│   │   │   ├── c66bcbf65d0873c2120d2b89dc82dc9d8a5c06
│   │   │   ├── e635d45fe106796e94693dc977071b29187470
│   │   ├── 7f
│   │   │   ├── 94ee8ea85d0d7464a80140c7b864ca607b74cf
│   │   │   ├── a06468618361583083d54a38f52f397de9cd0d
│   │   ├── 80
│   │   │   ├── 7855e032ad8e5062e0ec0ffed6a5914af40d1f
│   │   │   ├── 99f94d144e9c566e1ca67ce34dc9770d24f0a4
│   │   │   ├── cb9309cc41b270fbcda866d859e00822262f6c
│   │   ├── 81
│   │   │   ├── b3c3c62b30ece06f0597b1e2de9cdb198b7a3f
│   │   ├── 82
│   │   │   ├── 4441a445682bcad8290a730d31dafce586ff85
│   │   ├── 83
│   │   │   ├── 30e0aeb379d51d3de17a89839a25c80c03de3e
│   │   │   ├── bf9be013290d1053ae6ce5d7a70a6f2f23e212
│   │   │   ├── cf9f9bf29257a3855a3789b96d3b6162c50b56
│   │   ├── 84
│   │   │   ├── 5b45bfbb88f6cc8d5eab1ccd5385d4d5c68266
│   │   ├── 87
│   │   │   ├── 61c8f7ef0757dd930ab58fbc0185f3bd8d8f5c
│   │   │   ├── e9230acc2b309425e2bfcd2b9992ce3b07eb52
│   │   ├── 88
│   │   │   ├── a99e194ade4dfd76929460bcf29999ef3e00ab
│   │   ├── 89
│   │   │   ├── 8f0729a13602f131c4d5ab4284ef01e236ffeb
│   │   ├── 8a
│   │   │   ├── 51ba6773e2941495109423dd2606d43a7a0577
│   │   ├── 8b
│   │   │   ├── 5efa311957029e3993cedd6f16d45fd3c9da0e
│   │   │   ├── 85429b678c67432cc60b5538cf112194480c64
│   │   │   ├── 96d3fcbed751891227852fef366914753365e8
│   │   ├── 8c
│   │   │   ├── 994de094a95e97a519d4a87e3fbb2aeae174cd
│   │   ├── 8d
│   │   │   ├── 21ca80a93fe80b4c1204f4ed6e5a9e5f8d0f63
│   │   │   ├── 438a61b4b1764e992cc1842ce5e6b57fd4ffa1
│   │   ├── 8e
│   │   │   ├── 077f0bb9fcd3c08bbc7e4275d9f0a87a9577f8
│   │   │   ├── 9952ccea1e69c3068255d7cce4b05d7eb92209
│   │   │   ├── e6e4dbdad1b1f9841a5340c1905c284f2931a7
│   │   ├── 90
│   │   │   ├── 186061ca23980e80c407ec46ad9540c28b2245
│   │   │   ├── 232be4efdf93bfa245fbe301295e3ff2d87641
│   │   │   ├── 4d79fbece046b63cae58f59837036998dd3e3b
│   │   ├── 91
│   │   │   ├── 7baad84f2d996511dc2b32ba02bd6d432020d4
│   │   │   ├── c0a50b83998762c081aadde882d45f1037a822
│   │   ├── 92
│   │   │   ├── 12cbc99d413bd7f224dc6803d579ee42cdaaab
│   │   ├── 93
│   │   │   ├── 7df43ec12b6cff07a044a1429728b66122cee0
│   │   │   ├── c24a6a7e21700c8e1123a4d50cf114a26684be
│   │   ├── 94
│   │   │   ├── 107bb13f3cd27778c2080574b96622bcdb75f9
│   │   ├── 96
│   │   │   ├── eb2830f54ad578f9b99a388f3fe2880bd2aac7
│   │   ├── 97
│   │   │   ├── 76d43d81f8e15ba2460af459c7cfdeac5f0103
│   │   │   ├── 86101c28f7191f70868dcd6c5d83d564f06792
│   │   ├── 98
│   │   │   ├── 320ea5365177ea8c884bffc90c155ea95fc07b
│   │   │   ├── a55e26a68555c8dfb03da5a5e4d916c03fd1af
│   │   ├── 99
│   │   │   ├── 14adfbc6ac6b1b1c9180064ae472b9fc72792a
│   │   │   ├── 1543c0c66de7466423cb0838202e2e5338df26
│   │   │   ├── 9a03b223a88b4c56bcafd51f01586561396562
│   │   ├── 9a
│   │   │   ├── 052666d5cdde22e9a75ce5095d26817e4e38c3
│   │   │   ├── 946e3630f322ddd1633093d04580d13a8175c0
│   │   │   ├── badfde21c9474664b82f6b5782bca9e07461c6
│   │   ├── 9b
│   │   │   ├── 37d74a31409301dbbe3a7c67de5a7eed2c4f0d
│   │   │   ├── 601bfabc87940d40ec86f9e57c507fcc8a072f
│   │   │   ├── 8aa2246f31cb610b52798b678765a5a0bbb2ca
│   │   │   ├── acbb04e5fd34a0ee085b3fbdf409d7df4ac509
│   │   │   ├── d3e76b42912e32d2318a402daab8eedb9f50c4
│   │   │   ├── f4e5d48d6548b2f9c85a019ea504b1ef4e41df
│   │   ├── 9d
│   │   │   ├── e2256827aef953fb6ea5306c92e1e820254e25
│   │   ├── 9e
│   │   │   ├── ebbdd9955d9ab16773aef368dbea59529d6ac0
│   │   ├── 9f
│   │   │   ├── 5c2f4f96fb961a648b60a45bddef6b85e43762
│   │   │   ├── dc95b9ab0ff89e9cf0e2d4b700e477088a8337
│   │   ├── a0
│   │   │   ├── 0abb24a1a0ea4a2c277033870e2f4bff609100
│   │   │   ├── 4c40d402492e79d1d19771c3e6b0c328fa0954
│   │   │   ├── 8fab79133fcff8b08ed69a5ad5e4f439fe8ea3
│   │   │   ├── c73c07f9cbc1920384ed43db49b5d6850500f1
│   │   ├── a1
│   │   │   ├── c881eb5d2ab55fc53499add6b80b42ddab25ea
│   │   ├── a2
│   │   │   ├── 7e1325653d583eb2aad49cea2839ac99973979
│   │   │   ├── a718986b8f122b95d27d74ff889a45a29332fc
│   │   │   ├── e895d1628be8e56b3735aa61351a6e001cf127
│   │   ├── a3
│   │   │   ├── 8727c722536a958d869f1d4621c62cb898e122
│   │   ├── a4
│   │   │   ├── 0efc13f7b631765b82589332a890a8834e57b0
│   │   │   ├── 44af1f17e68f3bb2adb2a4fe8f611f658df2be
│   │   │   ├── 73245ede6808c61b318a649b0738c6e7958e64
│   │   ├── a5
│   │   │   ├── ac340899f17397469ccc468011f7f38e71b115
│   │   ├── a6
│   │   │   ├── 12de212f2455cea1e779aa5d51ded9bbd0a172
│   │   │   ├── 5d07fbfe73462a654a9e1a009f0ce50266b7e9
│   │   │   ├── 8f4bc82303751b19de60585599a3f5ea962488
│   │   │   ├── f600dba99e4c8e6c5daf8a1ba5711961b3844e
│   │   │   ├── ff048abe1e56b21581c733c554a59ac252de04
│   │   ├── a7
│   │   │   ├── 76e5db44d2b9ba4a500eb5e739777594e72515
│   │   │   ├── 7af8047a6528e2c9a504d3003fdd589e8be5d5
│   │   │   ├── d75f9f5f3a8d7d163fb1f94ade178409656e03
│   │   ├── a8
│   │   │   ├── 0edd000d1dc1ba1d5fc479e474653e55b64f6d
│   │   ├── a9
│   │   │   ├── 74935e8e45407f46ccc551d349345c6d04274b
│   │   │   ├── 8ec00115559570d475a38f2b99675c16cd06bf
│   │   ├── ab
│   │   │   ├── 4e7568f0de9df300d9316cbd160e307e640086
│   │   │   ├── 5203555efbd734bac49f69ae4f876cfdb604ec
│   │   │   ├── 9bd16d82c5b7bf85f240990c70a53df0fb1e71
│   │   │   ├── 9fd12b2e884dbaa3b241c887e82bf23ea835a9
│   │   ├── ac
│   │   │   ├── 552de577a9c72c2680abd8886509087f42eff5
│   │   ├── ad
│   │   │   ├── b2a8aebf8fef24c3612d703d0b8c93f00e0ba7
│   │   ├── ae
│   │   │   ├── 0455ad317584e3501f39957547be3745f4a44f
│   │   │   ├── c9ccef5154c6698587cc6ddbddb59de00b8ab0
│   │   │   ├── f13154aa64982595e00fdd41833caa8469de24
│   │   ├── af
│   │   │   ├── 4d6a1b1a238a467962b328453cba78c053b3d8
│   │   │   ├── 620718a91576e8d0709bca107796845cc8c313
│   │   │   ├── 9a0e2ec161d76a47f7b74f96b299708a9dd117
│   │   ├── b1
│   │   │   ├── 2d7688861a59981f5b8305453da4665b779129
│   │   │   ├── 636b583326c88bc7f40ded01d9a47c43e9e25a
│   │   │   ├── b355e2f71ad1336432fa7d2a2ddd6ae1c7809a
│   │   ├── b2
│   │   │   ├── 638f520027328ee82b0d5ba09b29401af98f33
│   │   ├── b4
│   │   │   ├── a513521dc518252290d2af498d0ebe617c03d3
│   │   │   ├── f082557fe7f5ed08af3c72563194637fd8faad
│   │   ├── b5
│   │   │   ├── 71d330c38e6117546ecacb603ef0dead8089ef
│   │   │   ├── 795806b686ca1dfbc798bfc7fc2f2a643168ab
│   │   ├── b6
│   │   │   ├── 6288144dfdc573d417ab8929f64485147cc66d
│   │   │   ├── ee1724f0a497e537f7fa6b68ec53a7aed9a129
│   │   ├── b7
│   │   │   ├── 2e43fcc178950198bad641f9625a89ce609795
│   │   │   ├── f218eb61ccddfcd5c86213e7aaa15a09a729a6
│   │   ├── b8
│   │   │   ├── 3f4986a4465b75e45132e4da8111b3b09bd789
│   │   ├── b9
│   │   │   ├── 8eeccbceccd0cf99d2cc605776ab196894a14b
│   │   ├── ba
│   │   │   ├── 5583ab78859bc069be12410a4be8214b2da4d9
│   │   │   ├── e5fcb13f3aa2a9e6907fff584a3277a78cc5cb
│   │   ├── bc
│   │   │   ├── a27ed71fd468f00f293a1c7c048a3690c0d0af
│   │   ├── bd
│   │   │   ├── 6edfe135bd6768336790547381a1e3c58ecbf0
│   │   │   ├── 8048f03972f1a4ee1f4fafef726c57fe9daa9c
│   │   │   ├── d0aac7e7e5c3d03c9c793dd6e6666d78493110
│   │   ├── bf
│   │   │   ├── 0ced228bd885ae1c34ab96a21754666b59de60
│   │   ├── c0
│   │   │   ├── 7a2b34d02b8abd686ad978eef8493b0c5fdcb2
│   │   ├── c1
│   │   │   ├── 01dbf654a9e7b6a3944388b55e4cf72cb6964c
│   │   ├── c2
│   │   │   ├── 84baad9e7ab4c82cf2ec7306c765a64ee99f3d
│   │   │   ├── a4bdc0d9eef33420ecffaca7df3f55c836fe48
│   │   │   ├── d26c06990586744e1bd7d2fa8e7ea93f27a6fd
│   │   │   ├── dd125b3d76bb7dd4f973d0155935b943328cbb
│   │   ├── c4
│   │   │   ├── 4d8c850a5cb9e0d3769a088673d800a372a29c
│   │   ├── c5
│   │   │   ├── 322a003f990effa8a878b667d42a39eb7d8632
│   │   │   ├── bc42d22d7ef057871731d84e3b8a16da6983e4
│   │   ├── c6
│   │   │   ├── 5ffd503a81a7e35932fd3307b7a800c5ee0703
│   │   ├── c7
│   │   │   ├── 2df93653b9ee678480e9d7b4115c083ceffffb
│   │   │   ├── d0824fa9e35923536f38376db25aafdee16e65
│   │   │   ├── e94ebd65fd18f136cbcbbf805f39dfe6a4b05f
│   │   ├── c8
│   │   │   ├── 01ce139e5c663a6e1d7c49c059a646c69f695f
│   │   │   ├── ab07eb787d551a6dfc4c6d7d5de9cdd53dd0a6
│   │   ├── c9
│   │   │   ├── c43390f3569c3ef59c7a77d27b2833a86dfda8
│   │   │   ├── eae6e41cbfd34e0a30fd0a145554d6c1e1ea92
│   │   ├── ca
│   │   │   ├── 47a870d1223b4c79546ddf29d1fd35167d27f3
│   │   │   ├── efbde183349d775d512c504fa982c8d5fdf01e
│   │   ├── cb
│   │   │   ├── 6c6aa2e064fcd0db2b2edd777b5cd19a32937d
│   │   │   ├── b5d4daf010b1ef5c70d192a13231a5280d9f67
│   │   ├── ce
│   │   │   ├── 577902f9344c728d52d64dfb84b7f4d303e1d6
│   │   │   ├── 6aad65e7ab1cdb3ec906276e4809aafbbb042d
│   │   ├── cf
│   │   │   ├── 037b2ac44636fc106e82335f68cfad36c920bb
│   │   │   ├── 999be710843707509ea751c46aab104ca4027e
│   │   │   ├── f664a6be6242670c310fad47bee368aa039c83
│   │   ├── d0
│   │   │   ├── 6932acb8ded27dadf1e7ddb20a3a5f41a02000
│   │   ├── d1
│   │   │   ├── 6ed1ed81a6aa7559e58bdcefcb9c013dc189ec
│   │   │   ├── 91f9ca767441880ae29b8965b8dfcd064af3ee
│   │   ├── d2
│   │   │   ├── 8780b43d955ab3dc6ae57d04d6d4ee286479ec
│   │   ├── d3
│   │   │   ├── d350b8bb6b48879a410f4be622ac6c413b204b
│   │   ├── d4
│   │   │   ├── 9369ec4d1aaa6714456bfc4c80c0b64663035e
│   │   │   ├── a73b616676f8669c70a70391c7a0295a1ef79e
│   │   │   ├── c223a84d694c4e35a62fcd29c7e228a50ba914
│   │   ├── d5
│   │   │   ├── b7d0c63368370808fdd38f0f12854368a41c25
│   │   ├── d7
│   │   │   ├── 5e102aedfbb86a215d0cfd668be50e2547669a
│   │   │   ├── b02c278a24bfac37cefa4fed7427e37295d543
│   │   ├── d9
│   │   │   ├── 9d2605b0289cd64ef5b3914abb32f816e97020
│   │   ├── dd
│   │   │   ├── 2ac119617083943e47a08b35255fb5aa4286f7
│   │   │   ├── 32874e3b918cbfb615a2ff8582524ea3c39f7b
│   │   │   ├── 377a850b4ea905f709cee48dd371e6fec85c5c
│   │   │   ├── e3f72fd71ae963560ced98d4f5b8450bdc65a1
│   │   ├── de
│   │   │   ├── 212cb6608f0f7aae54dd5801418f5c4fa8fcb2
│   │   ├── e1
│   │   │   ├── 865aa9d521979dcc3e96c9689e667180128cc5
│   │   │   ├── bc0fd8c66bc12364ae6c3ed9a73e10f4204012
│   │   ├── e2
│   │   │   ├── 344a25270500645b7a97566f64d6a698ddb847
│   │   ├── e3
│   │   │   ├── 5bb8fe5fa1632ba35b13e905161abe0bec8ca5
│   │   │   ├── 5de6f1098cdbad9bb2c4965d2a9d757011f254
│   │   ├── e4
│   │   │   ├── 11ec84bb6444733537387c5835d15f8815c2d7
│   │   │   ├── 62ff9ed4dca897c2052b663e9fad553523286b
│   │   ├── e5
│   │   │   ├── 4076b3a19f9463faa760c9e3212b5cae9c628d
│   │   │   ├── 487e47f56165463e4cf2e5304062cb740e64a0
│   │   │   ├── 8e208e965792818a893361cb9783afc73db40b
│   │   ├── e6
│   │   │   ├── 06c080e1db0e665b4637b7c32318dc938effcc
│   │   │   ├── 550f917284aff052bd66c05cc20c6f61bec81f
│   │   │   ├── 860789909911ec91e6970eac2bcf1dcba4c18c
│   │   │   ├── fbc7a0e23755b927b7559f2082547d961e4ed7
│   │   ├── e7
│   │   │   ├── 529fbd61aabc5626e58e446b282e4a1625ed5f
│   │   │   ├── c1b7a273816b93cd3dd91cb2bef4f89e60e677
│   │   │   ├── d3b4775b1be45cc9f108bb4aba0b0a8ff357a9
│   │   ├── e8
│   │   │   ├── 65fbdbba15dd81708d0263e6a9a719189c7ab6
│   │   │   ├── 67e710e65f1061cbee9f4597e55d6841161800
│   │   ├── e9
│   │   │   ├── 30eb27dbfb3afe2dbf30d2259b1d6c0863acd5
│   │   │   ├── 979f0df3b0d7aeb8a39a54a06e1335572c90da
│   │   │   ├── 9c71c271096b92642fdebf909bb83b5b69e346
│   │   │   ├── e89ef3fd79a1548e7823b15ce75442d54ebb08
│   │   │   ├── fd337eb52aac66f5eee2cb0c9650483b6be6cc
│   │   ├── ea
│   │   │   ├── 59a0e8fb4f0eec4eff71ecced5437bac52e09d
│   │   ├── eb
│   │   │   ├── e35644e51f72caa8c53ff8337853d042b5684e
│   │   │   ├── eb5c86fef3f8504c054dce4e5bdb648c8a0d87
│   │   │   ├── fd96fff90c5f405c073517bf03532d7c9cb88e
│   │   ├── ec
│   │   │   ├── dca67f4cd34b53f20723c935f3f8e8239eb774
│   │   │   ├── e0f9b106e5d81ae51d7a25435e4a0758e02824
│   │   ├── ed
│   │   │   ├── 584c15180479b98fd8cf0baad6724f20fb0cc7
│   │   │   ├── 6aed64409d311972c17eac3c9f1909b54f95f6
│   │   │   ├── bc101b96425e11aec73a5d498ccca2e0859fb2
│   │   │   ├── d424801437cfb286787ece17c60ad584ea3bf5
│   │   ├── ee
│   │   │   ├── 2a2e30b262c64b0c3ff82fe1d7bc4da0e0cdd7
│   │   │   ├── 3398eb0e27e877573f52a72b18bc44db285d16
│   │   │   ├── 63ab92ef9ca1ff307851285d021880131622e5
│   │   │   ├── d1c3206f6f515e8b6b63d626202dece477ed84
│   │   ├── ef
│   │   │   ├── 412ffef6deb85af4a525bea43281192444ef1c
│   │   │   ├── d36971f16a066c544f2025380aa09b6d188873
│   │   ├── f1
│   │   │   ├── 1caf264d862dc54510aa1d48101f4dcaf792d0
│   │   │   ├── afb96c17b3dbd3ae02da88c506b6ec9667d078
│   │   ├── f2
│   │   │   ├── 6f3c43709daaeb43615d9006b858dce32be49f
│   │   │   ├── 7382d5ef6f6539d2c17a2ae10145123b375957
│   │   │   ├── e2e36eae8bdadb68828b0f38cc9f50706e3f21
│   │   ├── f3
│   │   │   ├── aad9048816861449c770d84a7083c6f2eaa56a
│   │   ├── f4
│   │   │   ├── 8ff22b531072db7ed6c27656235049a86135c3
│   │   │   ├── e2e0f7ba08a8cadd551eaa80f63a0efad7f7bc
│   │   │   ├── f6eefb5e2f673f249770d0d45c6ec667c7849d
│   │   ├── f5
│   │   │   ├── 17b4aec4229479677aad31d9f236d519c2c41f
│   │   │   ├── f4b48b609e20ea736edd6c595779fdb6b2bdb9
│   │   ├── f6
│   │   │   ├── 0e6592afa424087b509aac37a1516855228796
│   │   │   ├── 4eb90c3006ae3b639162c48c8c82c8ae1d5b24
│   │   │   ├── 990416b1ff98a8f424fd2fd319893cb0c8d859
│   │   │   ├── e93be8941db81446b1d64d8b8ac171e76b9070
│   │   │   ├── f7e97e7bb9b0b2c3b65f31271180e6cb58cf04
│   │   ├── f7
│   │   │   ├── 1fc73cc4ccad653388cd41c7d7783bd514c4a7
│   │   ├── f9
│   │   │   ├── d19acecb68a087fa1232fe9327769662269fc1
│   │   │   ├── fac0c9c5b21ea72151fc5501fdbcbe8851ca90
│   │   ├── fa
│   │   │   ├── d9863a3c054964799e87c81c36232416710ec6
│   │   ├── fb
│   │   │   ├── 125880f690be697ca08f4238daca5e827b7cbb
│   │   │   ├── 89a5d7f9ada93d923c09fd2f35828a89ad4508
│   │   ├── fc
│   │   │   ├── 46ca45c9e3deaba724a86b16f9a300c8048961
│   │   │   ├── 84317d63693886a226ec4fa964ec0937339828
│   │   │   ├── ac514ce2f8bff4a4e749a68cc71ea8d8d7723f
│   │   │   ├── bab65f35e0d0d5bd41eb30571e6ae517134506
│   │   │   ├── c989bf99339b91f9e71ac0706478f16c0ad151
│   │   ├── fd
│   │   │   ├── 81cee6d5fb71158d0c495650a06ac7284dc913
│   │   │   ├── 824cc16243927bdcb59d8acf75aa4bdb6959d7
│   │   │   ├── be83cbf29ffbed690bf3b1e51dbe2cb1b039d1
│   │   ├── ff
│   │   │   ├── cfa7ca9497b2c6b0573f6f23cd081b327bb8e0
│   │   ├── info
│   │   ├── pack
│   ├── ORIG_HEAD
│   ├── refs
│   │   ├── heads
│   │   │   ├── feat
│   │   │   │   ├── 04-monorepo-scaffold
│   │   │   ├── main
│   │   │   ├── security
│   │   │   │   ├── 03-precommit-hooks
│   │   ├── remotes
│   │   │   ├── origin
│   │   │   │   ├── main
│   │   ├── tags
├── .gitattributes
├── .github
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   ├── SECURITY.md
├── .gitignore
├── .husky
│   ├── commit-msg
│   ├── pre-commit
│   ├── _
│   │   ├── .gitignore
│   │   ├── applypatch-msg
│   │   ├── commit-msg
│   │   ├── h
│   │   ├── husky.sh
│   │   ├── post-applypatch
│   │   ├── post-checkout
│   │   ├── post-commit
│   │   ├── post-merge
│   │   ├── post-rewrite
│   │   ├── pre-applypatch
│   │   ├── pre-auto-gc
│   │   ├── pre-commit
│   │   ├── pre-merge-commit
│   │   ├── pre-push
│   │   ├── pre-rebase
│   │   ├── prepare-commit-msg
├── .nvmrc
├── .prettierignore
├── .prettierrc
├── .secretscanrc.json
├── apps
│   ├── api
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── src
│   │   │   ├── index.ts
│   │   │   ├── middleware
│   │   │   │   ├── index.ts
│   │   │   ├── routes
│   │   │   │   ├── index.ts
│   │   │   ├── services
│   │   │   │   ├── index.ts
│   │   ├── tsconfig.json
│   ├── web
│   │   ├── package.json
│   │   ├── public
│   │   │   ├── .gitkeep
│   │   ├── README.md
│   │   ├── src
│   │   │   ├── app
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   ├── components
│   │   │   │   ├── index.ts
│   │   │   ├── hooks
│   │   │   │   ├── index.ts
│   │   │   ├── lib
│   │   │   │   ├── index.ts
│   │   ├── tsconfig.json
├── BRANCHES.md
├── contracts
│   ├── Clarinet.toml
│   ├── contracts
│   │   ├── stream-core.clar
│   ├── README.md
│   ├── settings
│   │   ├── Devnet.toml
│   ├── tests
│   │   ├── stream-core.test.ts
├── docs
│   ├── adr
│   │   ├── 0001-monorepo-structure.md
│   │   ├── README.md
│   │   ├── _template.md
├── package-lock.json
├── package.json
├── packages
│   ├── sdk
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── src
│   │   │   ├── index.ts
│   │   ├── tsconfig.cjs.json
│   │   ├── tsconfig.esm.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.types.json
│   ├── types
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── src
│   │   │   ├── index.ts
│   │   ├── tsconfig.json
│   ├── utils
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── src
│   │   │   ├── index.ts
│   │   ├── tsconfig.json
├── PRD.md
├── README.md
├── scripts
│   ├── bip39-wordlist.json
│   ├── guard-env-files.js
│   ├── guard-large-files.js
│   ├── guard-mainnet-toml.js
│   ├── index.js
│   ├── scan-bip39-mnemonic.js
│   ├── scan-entropy.js
│   ├── scan-hiro-keys.js
│   ├── scan-npm-tokens.js
│   ├── scan-private-keys.js
│   ├── scan-secrets.js
│   ├── validate-commit-msg.js
│   ├── __tests__
│   │   ├── hooks.test.js
├── SECURITY_HOOKS.md
├── TOOLCHAIN_NOTES.md
├── tsconfig.base.json
├── tsconfig.json
├── turbo.json
[generator] find fallback (tree unavailable)
```
